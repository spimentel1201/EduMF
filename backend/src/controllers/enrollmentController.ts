import { Request, Response } from 'express';
import { createEnrollment } from '../services/enrollmentService';
import User, { IUser } from '../models/User';
import Section from '../models/Section';
import SchoolYear from '../models/SchoolYear';
import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment';
import * as XLSX from 'xlsx';
import { parseSiagieSheet, SiagieFila, nombreSeccion } from '../services/siagieParser';
import {
  FRASE_CONFIRMACION_RESET,
  getResetPreview,
  resetStudents,
} from '../services/studentResetService';

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const enrollment = await createEnrollment(req.body);
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkEnrollStudents = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
  }

  const { schoolYearName, sectionName } = req.body;

  if (!schoolYearName) {
    return res.status(400).json({ message: 'El nombre del año escolar es requerido.' });
  }
  if (!sectionName) {
    return res.status(400).json({ message: 'El nombre de la sección es requerido.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 11 });

    const studentsToEnroll = jsonData.map((row: any) => ({
      firstName: row[0],
      lastName: row[1],
      dni: row[2],
      gender: row[3],
      birthDate: row[4],
    }));

    const section = await Section.findOne({ name: sectionName }).session(session);
    if (!section) {
      throw new Error(`Sección '${sectionName}' no encontrada en la base de datos.`);
    }

    const schoolYear = await SchoolYear.findOne({ name: schoolYearName }).session(session);
    if (!schoolYear) {
      throw new Error(`Año escolar '${schoolYearName}' no encontrado.`);
    }

    const createdEnrollments = [];
    const errors = [];

    for (const studentData of studentsToEnroll) {
      const { dni, firstName, lastName } = studentData;

      if (!dni || !firstName || !lastName) {
        errors.push(`Datos incompletos para un estudiante: ${JSON.stringify(studentData)}`);
        continue;
      }

      try {
        let student = await User.findOne({ dni: String(dni) }).session(session);

        if (!student) {
          const limpiar = (valor: string) =>
            String(valor || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9]+/g, '')
              .toLowerCase();
          const generatedEmail = `${limpiar(String(firstName).split(' ')[0])}.${limpiar(
            String(lastName).split(' ')[0]
          )}.${dni}@escuela.com`;
          [student] = await User.create([{
            dni: String(dni),
            firstName: String(firstName),
            lastName: String(lastName),
            email: generatedEmail,
            role: 'student',
            password: String(dni),
          }], { session });
        } else if (student.role !== 'student') {
          throw new Error(`El usuario con DNI ${dni} ya existe pero no es un estudiante.`);
        }

        const existingEnrollment = await Enrollment.findOne({
          studentId: student._id,
          sectionId: section._id,
          schoolYearId: schoolYear._id
        }).session(session);

        if (existingEnrollment) {
          console.log(`El estudiante ${student.firstName} ${student.lastName} ya está matriculado.`);
          continue;
        }

        if (section.currentStudents >= section.maxStudents) {
          throw new Error(`La sección '${section.name}' ha alcanzado su capacidad máxima.`);
        }

        const enrollment = new Enrollment({
          studentId: student._id,
          sectionId: section._id,
          schoolYearId: schoolYear._id,
          level: section.level,
        });
        await enrollment.save({ session });
        createdEnrollments.push(enrollment);

        section.currentStudents += 1;

      } catch (error: any) {
        errors.push(`Error procesando DNI ${dni}: ${error.message}`);
      }
    }

    await section.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      msg:
        errors.length > 0
          ? `Matrícula masiva completada con ${errors.length} incidencia(s).`
          : 'Matrícula masiva completada con éxito.',
      totalProcessed: studentsToEnroll.length,
      successCount: createdEnrollments.length,
      errors,
      data: { createdEnrollments },
    });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error en matrícula masiva:', error);
    res.status(500).json({ message: error.message || 'Error en la matrícula masiva.' });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Importación del reporte SIAGIE
// ─────────────────────────────────────────────────────────────────────────────

type CategoriaFila =
  | 'nuevo'
  | 'existente_nuevo'
  | 'ya_matriculado'
  | 'conflicto'
  | 'omitido_trasladado'
  | 'duplicado'
  | 'sin_seccion';

interface InfoSeccion {
  clave: string;
  nombre: string;
  grado: number;
  seccion: string;
  existe: boolean;
  section?: any;
  capacidad: number;
  matriculados: number;
  porMatricular: number;
}

interface OpcionesImportacion {
  crearSecciones: boolean;
  incluirTrasladados: boolean;
  nivel: string;
}

const claveSeccion = (grado: number, seccion: string) =>
  `${grado}${String(seccion || '').toUpperCase()}`;

const esTrasladado = (fila: SiagieFila) => /TRASLAD/.test(fila.estadoMatricula || '');

const sinAcentos = (valor: any) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function slugEmail(valor: string): string {
  return sinAcentos(valor).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

/** Devuelve un email único para el estudiante (nunca rompe por duplicado). */
async function generarEmailUnico(fila: SiagieFila, documento: string): Promise<string> {
  const nombre = fila.nombres.split(' ')[0] || fila.nombres;
  const base = `${slugEmail(nombre)}.${slugEmail(fila.apellidoPaterno)}.${documento}`;
  let candidato = `${base}@escuela.com`;
  let intento = 1;
  // Tope defensivo: nunca más de 50 intentos
  while (intento < 50 && (await User.exists({ email: candidato }))) {
    intento += 1;
    candidato = `${base}${intento}@escuela.com`;
  }
  return candidato;
}

/** Secciones del año destino; si falta alguna se busca por nombre en otros años. */
async function construirMapaSecciones(anioId: any): Promise<Map<string, any>> {
  const todas = await Section.find({}).select('name grade section level maxStudents currentStudents schoolYearId status').lean();
  const mapa = new Map<string, any>();
  for (const seccion of todas) {
    const clave = claveSeccion(seccion.grade, seccion.section);
    const actual = mapa.get(clave);
    if (!actual) {
      mapa.set(clave, seccion);
    } else if (
      String(actual.schoolYearId) !== String(anioId) &&
      String(seccion.schoolYearId) === String(anioId)
    ) {
      mapa.set(clave, seccion);
    }
  }
  return mapa;
}

/** Analiza el archivo contra la base de datos sin escribir nada. */
async function analizarSiagie(
  filas: SiagieFila[],
  anio: any,
  opciones: OpcionesImportacion
) {
  const mapaSecciones = await construirMapaSecciones(anio._id);

  const documentos = Array.from(new Set(filas.map((f) => f.documento).filter(Boolean)));
  const usuarios = documentos.length
    ? await User.find({
        $or: [{ dni: { $in: documentos } }, { codigoEstudiante: { $in: documentos } }],
      })
        .select('firstName lastName dni codigoEstudiante tipoDocumento gender birthdate apoderado email role status')
        .lean()
    : [];

  const porDni = new Map<string, any>();
  const porCodigo = new Map<string, any>();
  for (const usuario of usuarios) {
    if (usuario.dni) porDni.set(String(usuario.dni), usuario);
    if (usuario.codigoEstudiante) porCodigo.set(String(usuario.codigoEstudiante), usuario);
  }

  const alumnoIds = usuarios.map((u: any) => u._id);
  const matriculas = alumnoIds.length
    ? await Enrollment.find({ studentId: { $in: alumnoIds }, schoolYearId: anio._id }).lean()
    : [];

  const matriculaPorAlumno = new Map<string, any[]>();
  for (const matricula of matriculas) {
    const clave = String(matricula.studentId);
    const lista = matriculaPorAlumno.get(clave) || [];
    lista.push(matricula);
    matriculaPorAlumno.set(clave, lista);
  }

  const secciones = new Map<string, InfoSeccion>();
  const items: Array<{
    fila: SiagieFila;
    categoria: CategoriaFila;
    existente?: any;
    info: InfoSeccion;
  }> = [];

  for (const fila of filas) {
    const clave = claveSeccion(fila.grado, fila.seccion);
    let info = secciones.get(clave);
    if (!info) {
      const section = mapaSecciones.get(clave);
      info = {
        clave,
        nombre: nombreSeccion(fila.grado, fila.seccion, opciones.nivel),
        grado: fila.grado,
        seccion: fila.seccion,
        existe: Boolean(section),
        section,
        capacidad: section?.maxStudents ?? 30,
        matriculados: section?.currentStudents ?? 0,
        porMatricular: 0,
      };
      secciones.set(clave, info);
    }

    const existente = porDni.get(fila.documento) || porCodigo.get(fila.documento);

    let categoria: CategoriaFila;
    if (fila.duplicadoEnArchivo) {
      categoria = 'duplicado';
    } else if (esTrasladado(fila) && !opciones.incluirTrasladados) {
      categoria = 'omitido_trasladado';
    } else if (!info.existe && !opciones.crearSecciones) {
      categoria = 'sin_seccion';
    } else {
      const matriculasAlumno = existente
        ? matriculaPorAlumno.get(String(existente._id)) || []
        : [];
      const yaEnEstaSeccion = matriculasAlumno.some(
        (m) => info!.section && String(m.sectionId) === String(info!.section._id)
      );

      if (yaEnEstaSeccion) {
        categoria = 'ya_matriculado';
      } else if (matriculasAlumno.length > 0) {
        categoria = 'conflicto';
      } else if (existente) {
        categoria = 'existente_nuevo';
      } else {
        categoria = 'nuevo';
      }

      if (categoria === 'nuevo' || categoria === 'existente_nuevo') {
        info.porMatricular += 1;
      }
    }

    items.push({ fila, categoria, existente: existente || undefined, info });
  }

  return { secciones, items, documentos };
}

function resumirCategorias(items: Array<{ categoria: CategoriaFila }>) {
  const contar = (categoria: CategoriaFila) => items.filter((i) => i.categoria === categoria).length;
  return {
    nuevos: contar('nuevo'),
    existentesNuevos: contar('existente_nuevo'),
    yaMatriculados: contar('ya_matriculado'),
    conflictos: contar('conflicto'),
    omitidosTrasladados: contar('omitido_trasladado'),
    duplicados: contar('duplicado'),
    sinSeccion: contar('sin_seccion'),
  };
}

const leerBooleano = (valor: any, porDefecto = false): boolean => {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  return String(valor).toLowerCase() === 'true' || String(valor) === '1';
};

/**
 * @desc    Analiza el Excel de SIAGIE sin guardar nada (dry-run)
 * @route   POST /api/enrollments/import/siagie/preview
 */
export const previewSiagieImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    const schoolYearId = String(req.body.schoolYearId || '');
    if (!schoolYearId) {
      return res.status(400).json({ message: 'Selecciona el año académico de destino.' });
    }

    const anio = await SchoolYear.findById(schoolYearId).lean();
    if (!anio) {
      return res.status(404).json({ message: 'El año académico seleccionado no existe.' });
    }

    const parsed = parseSiagieSheet(req.file.buffer);
    const opciones: OpcionesImportacion = {
      crearSecciones: leerBooleano(req.body.crearSeccionesFaltantes),
      incluirTrasladados: leerBooleano(req.body.incluirTrasladados),
      nivel: (parsed.meta.nivel || 'Secundaria').trim(),
    };

    const { secciones, items } = await analizarSiagie(parsed.filas, anio, opciones);
    const resumen = resumirCategorias(items);

    const seccionesJson = Array.from(secciones.values()).map((info) => ({
      clave: info.clave,
      nombre: info.nombre,
      grado: info.grado,
      seccion: info.seccion,
      sectionId: info.section?._id || null,
      existe: info.existe,
      capacidad: info.capacidad,
      matriculados: info.matriculados,
      porMatricular: info.porMatricular,
      resultante: info.matriculados + info.porMatricular,
      excedeCapacidad: info.matriculados + info.porMatricular > info.capacidad,
    }));

    res.status(200).json({
      success: true,
      data: {
        hoja: parsed.hoja,
        meta: parsed.meta,
        anio: { id: String(anio._id), name: anio.name },
        opciones,
        totalFilas: parsed.filas.length,
        resumen: { total: parsed.filas.length, ...resumen },
        secciones: seccionesJson,
        faltantes: seccionesJson.filter((s) => !s.existe).map((s) => s.nombre),
        excedidas: seccionesJson.filter((s) => s.excedeCapacidad).map((s) => s.nombre),
        advertencias: parsed.advertencias.slice(0, 200),
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'No se pudo leer el archivo de SIAGIE.' });
  }
};

/**
 * @desc    Importa y matricula a todos los estudiantes del Excel de SIAGIE
 * @route   POST /api/enrollments/import/siagie/commit
 */
export const commitSiagieImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    const schoolYearId = String(req.body.schoolYearId || '');
    if (!schoolYearId) {
      return res.status(400).json({ message: 'Selecciona el año académico de destino.' });
    }

    const anio = await SchoolYear.findById(schoolYearId).lean();
    if (!anio) {
      return res.status(404).json({ message: 'El año académico seleccionado no existe.' });
    }

    const parsed = parseSiagieSheet(req.file.buffer);
    const opciones: OpcionesImportacion = {
      crearSecciones: leerBooleano(req.body.crearSeccionesFaltantes),
      incluirTrasladados: leerBooleano(req.body.incluirTrasladados),
      nivel: (parsed.meta.nivel || 'Secundaria').trim(),
    };

    const { secciones, items } = await analizarSiagie(parsed.filas, anio, opciones);

    const faltantes = Array.from(secciones.values()).filter((s) => !s.existe);
    if (faltantes.length > 0 && !opciones.crearSecciones) {
      return res.status(400).json({
        message:
          `Faltan ${faltantes.length} secciones en el año ${anio.name}: ` +
          `${faltantes.map((s) => s.nombre).join(', ')}. ` +
          'Activa "crear secciones faltantes" o créalas manualmente.',
      });
    }

    let seccionesCreadas = 0;
    if (opciones.crearSecciones) {
      for (const info of faltantes) {
        try {
          const nueva = await Section.create({
            name: info.nombre,
            level: opciones.nivel,
            grade: info.grado,
            section: info.seccion,
            maxStudents: 30,
            currentStudents: 0,
            schoolYearId: anio._id,
            status: 'Activo',
          });
          info.section = nueva.toObject();
          info.existe = true;
          info.capacidad = nueva.maxStudents;
          info.matriculados = 0;
          seccionesCreadas += 1;
        } catch (error: any) {
          // Si otra ejecución la creó primero, se busca de nuevo
          const existente = await Section.findOne({
            grade: info.grado,
            section: info.seccion,
            schoolYearId: anio._id,
          });
          if (existente) {
            info.section = existente.toObject();
            info.existe = true;
          } else {
            info.section = undefined;
          }
        }
      }
    }

    const errores: Array<{ fila: number; documento: string; mensaje: string }> = [];
    let usuariosCreados = 0;
    let usuariosActualizados = 0;
    let matriculados = 0;

    for (const item of items) {
      if (item.categoria !== 'nuevo' && item.categoria !== 'existente_nuevo') continue;

      const { fila, info } = item;
      const seccion = info.section;
      if (!seccion?._id) {
        errores.push({
          fila: fila.fila,
          documento: fila.documento,
          mensaje: `No se pudo resolver la sección ${info.nombre}.`,
        });
        continue;
      }

      try {
        let estudiante: any = item.existente;

        if (estudiante && estudiante.role && estudiante.role !== 'student') {
          throw new Error(`El documento ${fila.documento} pertenece a un usuario con rol "${estudiante.role}".`);
        }

        // Matrícula ya existente (pudo crearse en otra ejecución)
        const yaMatriculado = await Enrollment.findOne({
          studentId: estudiante?._id,
          sectionId: seccion._id,
          schoolYearId: anio._id,
        });
        if (estudiante && yaMatriculado) {
          continue;
        }

        if (estudiante) {
          const cambios: any = {};
          if (!estudiante.birthdate && fila.birthdate) cambios.birthdate = fila.birthdate;
          if ((!estudiante.gender || estudiante.gender === 'O') && fila.gender !== 'O') cambios.gender = fila.gender;
          if (!estudiante.codigoEstudiante && fila.codigoEstudiante) cambios.codigoEstudiante = fila.codigoEstudiante;
          if (!estudiante.tipoDocumento) cambios.tipoDocumento = fila.tipoDocumento;
          if (!estudiante.apoderado?.nombres && fila.apoderado) cambios.apoderado = fila.apoderado;
          if (!estudiante.email) cambios.email = await generarEmailUnico(fila, fila.documento);

          if (Object.keys(cambios).length > 0) {
            await User.updateOne({ _id: estudiante._id }, { $set: cambios });
            estudiante = { ...estudiante, ...cambios };
            usuariosActualizados += 1;
          }
        } else {
          const email = await generarEmailUnico(fila, fila.documento);
          estudiante = await User.create({
            dni: fila.documento,
            codigoEstudiante: fila.codigoEstudiante,
            tipoDocumento: fila.tipoDocumento,
            firstName: fila.firstName,
            lastName: fila.lastName,
            gender: fila.gender,
            birthdate: fila.birthdate,
            apoderado: fila.apoderado,
            email,
            password: fila.documento,
            role: 'student',
            status: 'active',
          });
          usuariosCreados += 1;
        }

        // Incremento atómico con control de capacidad
        const actualizada = await Section.findOneAndUpdate(
          {
            _id: seccion._id,
            $expr: { $lt: ['$currentStudents', '$maxStudents'] },
          },
          { $inc: { currentStudents: 1 } },
          { new: true }
        );

        if (!actualizada) {
          if (!item.existente) {
            // El alumno se creó pero no hay cupo: se deja sin matrícula
            usuariosCreados -= 1;
          }
          errores.push({
            fila: fila.fila,
            documento: fila.documento,
            mensaje: `La sección ${info.nombre} alcanzó su capacidad máxima (${seccion.maxStudents}).`,
          });
          continue;
        }

        try {
          await Enrollment.create({
            studentId: estudiante._id,
            sectionId: seccion._id,
            schoolYearId: anio._id,
            level: opciones.nivel,
          });
          matriculados += 1;
        } catch (errorMatricula: any) {
          await Section.updateOne({ _id: seccion._id }, { $inc: { currentStudents: -1 } });
          if (errorMatricula?.code === 11000) {
            // Ya existía la matrícula: no es un error real
            continue;
          }
          throw errorMatricula;
        }
      } catch (error: any) {
        errores.push({
          fila: fila.fila,
          documento: fila.documento,
          mensaje: error?.message || 'Error desconocido al importar la fila.',
        });
      }
    }

    const resumen = resumirCategorias(items);
    const seccionesJson = Array.from(secciones.values()).map((info) => ({
      clave: info.clave,
      nombre: info.nombre,
      existe: info.existe,
      capacidad: info.capacidad,
      matriculados: info.matriculados,
      porMatricular: info.porMatricular,
      resultante: info.matriculados + info.porMatricular,
    }));

    res.status(200).json({
      success: true,
      data: {
        hoja: parsed.hoja,
        meta: parsed.meta,
        anio: { id: String(anio._id), name: anio.name },
        totalFilas: parsed.filas.length,
        resumen: {
          total: parsed.filas.length,
          ...resumen,
          usuariosCreados,
          usuariosActualizados,
          matriculados,
          seccionesCreadas,
          errores: errores.length,
        },
        secciones: seccionesJson,
        errores: errores.slice(0, 200),
        advertencias: parsed.advertencias.slice(0, 200),
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'No se pudo importar el archivo de SIAGIE.' });
  }
};

/**
 * @desc    Muestra qué se borraría al reiniciar los datos de estudiantes
 * @route   GET /api/enrollments/import/reset/preview
 */
export const previewStudentReset = async (_req: Request, res: Response) => {
  try {
    const resumen = await getResetPreview();
    res.status(200).json({
      success: true,
      data: { resumen, fraseConfirmacion: FRASE_CONFIRMACION_RESET },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'No se pudo calcular el reinicio.' });
  }
};

/**
 * @desc    Borra estudiantes y todo lo asociado, devolviendo un backup JSON
 * @route   POST /api/enrollments/import/reset
 */
export const resetStudentsController = async (req: Request, res: Response) => {
  try {
    const { confirmacion, backup: incluirBackup } = req.body;
    const { backup, resumen } = await resetStudents(String(confirmacion ?? ''));

    if (incluirBackup === false || incluirBackup === 'false') {
      return res.status(200).json({ success: true, data: { resumen, backup: null } });
    }

    res.status(200).json({ success: true, data: { resumen, backup } });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'No se pudo reiniciar los datos de estudiantes.' });
  }
};


export const getStudentsBySection = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;

    if (!sectionId) {
      return res.status(400).json({ message: 'El ID de la sección es requerido.' });
    }

    const enrollments = await Enrollment.find({ sectionId })
      .populate('studentId', 'firstName lastName dni')
      .exec();

    const students = enrollments.map(enrollment => enrollment.studentId);

    res.status(200).json(students);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al obtener estudiantes por sección.' });
  }
};

