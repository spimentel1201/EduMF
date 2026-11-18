import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User';
import Guardian, { GuardianDocumentType } from '../models/Guardian';
import Enrollment from '../models/Enrollment';
import SchoolYear from '../models/SchoolYear';
import Section from '../models/Section';

/** Normaliza un documento, código o teléfono para usarlo como login/alias. */
export function normalizarLogin(valor?: string | null): string {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Valores que SIAGIE escribe cuando no hay documento real. */
const DOCUMENTOS_INVALIDOS = new Set([
  'SD',
  'SN',
  'NN',
  'X',
  'XX',
  'XXX',
  'SINDOCUMENTO',
  'SINDNI',
  'NOTIENE',
  'SINNUMERO',
  '00000000',
  '000000000',
  '0000000000',
  '00000000000',
]);

function documentoValido(documento: string, tipoRaw: unknown): boolean {
  if (!documento || DOCUMENTOS_INVALIDOS.has(documento)) return false;
  const tipo = normalizarLogin(String(tipoRaw ?? ''));
  if (tipo.includes('DNI')) return /^\d{8}$/.test(documento);
  if (tipo.includes('CE') || tipo.includes('PAS') || tipo.includes('EXTRANJ')) {
    return /^[A-Z0-9]{6,12}$/.test(documento);
  }
  return /^\d{8}$/.test(documento) || /^[A-Z0-9]{6,12}$/.test(documento);
}

/** Variantes útiles de un documento/código (con y sin ceros a la izquierda). */
function variantesCodigo(codigo?: string | null): string[] {
  const normalizado = normalizarLogin(codigo);
  if (!normalizado) return [];
  const sinCeros = normalizado.replace(/^0+/, '');
  return sinCeros && sinCeros !== normalizado ? [normalizado, sinCeros] : [normalizado];
}

/** Variantes de teléfono: tal cual y sin el prefijo 51 de Perú. */
function variantesTelefono(telefono?: string | null): string[] {
  const normalizado = normalizarLogin(telefono);
  if (!normalizado) return [];
  if (normalizado.length === 11 && normalizado.startsWith('51')) {
    return [normalizado, normalizado.slice(2)];
  }
  return [normalizado];
}

function mapearTipoDocumento(raw: unknown, documento?: string): GuardianDocumentType {
  const tipo = normalizarLogin(String(raw ?? ''));
  if (tipo.includes('DNI')) return 'DNI';
  if (tipo.includes('CE') || tipo.includes('EXTRANJ') || tipo.includes('CARNET')) return 'CE';
  if (tipo.includes('PAS')) return 'PAS';
  if (documento && documento.length === 8) return 'DNI';
  return 'OTRO';
}

function esEmailValido(valor?: string | null): boolean {
  return Boolean(valor && /^\S+@\S+\.\S+$/.test(valor));
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores.filter(Boolean))];
}

function mismoConjunto(a: string[], b: string[]): boolean {
  const ordenar = (valores: string[]) => [...valores].map(String).sort();
  const uno = ordenar(a);
  const dos = ordenar(b);
  return uno.length === dos.length && uno.every((valor, i) => valor === dos[i]);
}

function celdaCsv(valor: unknown): string {
  let texto = String(valor ?? '');
  // Evita inyección de fórmulas al abrir el CSV en Excel.
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\n\r;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function escribirCsv(archivo: string, cabecera: string[], filas: unknown[][]): void {
  const lineas = [
    cabecera.map(celdaCsv).join(','),
    ...filas.map((fila) => fila.map(celdaCsv).join(',')),
  ];
  fs.writeFileSync(archivo, '\uFEFF' + lineas.join('\r\n'), 'utf8');
}

interface GrupoTutor {
  loginId: string;
  aliases: string[];
  documento?: string;
  tipoDocumento?: GuardianDocumentType;
  nombres: string;
  telefono?: string;
  email?: string;
  students: mongoose.Types.ObjectId[];
  nombresAlumnos: string[];
  origen: 'import' | 'phone';
}

export interface GuardianImportOptions {
  /** No escribe en Mongo ni genera CSV; solo calcula el resultado. */
  dryRun?: boolean;
  escribirCsv?: boolean;
  carpetaSalida?: string;
}

export interface GuardianImportReport {
  estudiantes: number;
  familias: number;
  familiasConHermanos: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  pendientes: number;
  conflictos: string[];
  archivos: {
    credenciales?: string;
    pendientes?: string;
    conflictos?: string;
  };
}

/**
 * Alta masiva de tutores a partir del `apoderado` embebido en los alumnos.
 *
 * - Agrupa por documento válido del tutor; si no hay, por teléfono (≥ 6 dígitos).
 * - Fusiona hermanos que solo coinciden por teléfono con el grupo del documento.
 * - Los alumnos sin documento ni teléfono quedan como pendientes.
 * - Es idempotente: no duplica tutores ni toca contraseñas personalizadas.
 * - Nunca escribe datos personales en consola; los CSV van a backups/.
 */
export async function importGuardians(
  options: GuardianImportOptions = {}
): Promise<GuardianImportReport> {
  const { dryRun = false, escribirCsv: generarCsv = true, carpetaSalida } = options;

  const estudiantes = await User.find({ role: 'student', status: 'active' })
    .select('firstName lastName dni codigoEstudiante apoderado')
    .lean();

  const grupos = new Map<string, GrupoTutor>();
  const pendientes: Array<{ student: any; motivo: string }> = [];

  for (const student of estudiantes as any[]) {
    const apoderado = student.apoderado || {};
    const documentoCrudo = normalizarLogin(apoderado.numeroDocumento);
    const documento = documentoValido(documentoCrudo, apoderado.tipoDocumento)
      ? documentoCrudo
      : '';
    const telefono = normalizarLogin(apoderado.telefono);

    let clave: string;
    let loginId: string;

    if (documento) {
      clave = `D:${documento}`;
      loginId = documento;
    } else if (telefono.length >= 6) {
      clave = `T:${telefono}`;
      loginId = telefono;
    } else {
      pendientes.push({
        student,
        motivo: documentoCrudo
          ? 'Documento de apoderado inválido'
          : 'Sin documento ni teléfono de apoderado',
      });
      continue;
    }

    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = {
        loginId,
        aliases: [],
        documento: documento || undefined,
        tipoDocumento: documento
          ? mapearTipoDocumento(apoderado.tipoDocumento, documento)
          : undefined,
        nombres: '',
        telefono: telefono || undefined,
        origen: documento ? 'import' : 'phone',
        students: [],
        nombresAlumnos: [],
      };
      grupos.set(clave, grupo);
    }

    grupo.students.push(student._id);
    grupo.nombresAlumnos.push(`${student.firstName} ${student.lastName}`.trim());

    grupo.aliases.push(...variantesCodigo(student.dni));
    grupo.aliases.push(...variantesCodigo(student.codigoEstudiante));
    grupo.aliases.push(...variantesTelefono(telefono));

    if (!grupo.nombres && String(apoderado.nombres || '').trim()) {
      grupo.nombres = String(apoderado.nombres).trim();
    }
    if (!grupo.email && esEmailValido(apoderado.correo)) {
      grupo.email = String(apoderado.correo).trim().toLowerCase();
    }
    if (!grupo.telefono && telefono) {
      grupo.telefono = telefono;
    }
  }

  // Fusiona grupos que solo tienen teléfono con el grupo del documento cuando
  // el teléfono ya es un alias de este (hermanos con datos incompletos).
  const grupoPorAlias = new Map<string, GrupoTutor>();
  for (const grupo of grupos.values()) {
    if (!grupo.documento) continue;
    for (const alias of unicos([...grupo.aliases, grupo.loginId])) {
      grupoPorAlias.set(alias, grupo);
    }
  }
  for (const [clave, grupo] of [...grupos.entries()]) {
    if (grupo.documento) continue;
    const destino = grupoPorAlias.get(grupo.loginId);
    if (!destino) continue;

    destino.students.push(...grupo.students);
    destino.nombresAlumnos.push(...grupo.nombresAlumnos);
    destino.aliases.push(...grupo.aliases);
    if (!destino.nombres && grupo.nombres) destino.nombres = grupo.nombres;
    if (!destino.telefono && grupo.telefono) destino.telefono = grupo.telefono;
    if (!destino.email && grupo.email) destino.email = grupo.email;
    grupos.delete(clave);
  }

  // Resolución determinista de alias: el loginId de otro tutor siempre gana.
  // Un alias compartido se queda con el primer dueño y se reporta.
  const conflictos: string[] = [];
  const duenoAlias = new Map<string, string>();
  for (const grupo of grupos.values()) {
    duenoAlias.set(grupo.loginId, grupo.loginId);
  }
  const ordenados = [...grupos.values()].sort((a, b) => {
    const porDocumento = Number(Boolean(b.documento)) - Number(Boolean(a.documento));
    return porDocumento || a.loginId.localeCompare(b.loginId);
  });
  for (const grupo of ordenados) {
    const aliases: string[] = [];
    for (const alias of unicos(grupo.aliases).filter((valor) => valor !== grupo.loginId)) {
      const dueno = duenoAlias.get(alias);
      if (dueno && dueno !== grupo.loginId) {
        conflictos.push(`El alias ${alias} está compartido por ${dueno} y ${grupo.loginId}`);
        continue;
      }
      duenoAlias.set(alias, grupo.loginId);
      aliases.push(alias);
    }
    grupo.aliases = aliases;
    if (!grupo.nombres) {
      grupo.nombres = `APODERADO DE ${grupo.nombresAlumnos[0] || grupo.loginId}`;
    }
  }

  // Tutores ya existentes: se comparan por loginId y por alumno vinculado.
  const existentes = await Guardian.find({})
    .select('loginId aliases students nombres telefono email documento tipoDocumento source hasCustomPassword')
    .lean();
  const porLoginId = new Map<string, any>();
  const porAlumno = new Map<string, any[]>();
  for (const guardian of existentes as any[]) {
    porLoginId.set(String(guardian.loginId), guardian);
    for (const studentId of guardian.students || []) {
      const clave = String(studentId);
      const vinculados = porAlumno.get(clave) || [];
      vinculados.push(guardian);
      porAlumno.set(clave, vinculados);
    }
  }

  let creados = 0;
  let actualizados = 0;
  let sinCambios = 0;
  const credenciales: unknown[][] = [];

  for (const grupo of grupos.values()) {
    // Reasigna el alumno si su apoderado cambió en SIAGIE. No se tocan los
    // tutores creados a mano (source = manual).
    for (const studentId of grupo.students) {
      const vinculados = porAlumno.get(String(studentId)) || [];
      for (const viejo of vinculados) {
        if (String(viejo.loginId) === grupo.loginId) continue;
        if (viejo.source === 'manual') {
          conflictos.push(
            `El alumno ${grupo.nombresAlumnos[0]} está vinculado manualmente a ${viejo.loginId}; ` +
            `se conserva ese vínculo además de ${grupo.loginId}`
          );
          continue;
        }
        if (!dryRun) {
          await Guardian.updateOne({ _id: viejo._id }, { $pull: { students: studentId } });
        }
        viejo.students = (viejo.students || []).filter(
          (id: unknown) => String(id) !== String(studentId)
        );
        conflictos.push(
          `Se reasignó un alumno de ${viejo.loginId} a ${grupo.loginId}`
        );
      }
    }

    const existente = porLoginId.get(grupo.loginId);
    const esManual = existente?.source === 'manual';
    let claveInicial = grupo.loginId;

    if (!existente) {
      creados++;
      if (!dryRun) {
        const creado = await Guardian.create({
          loginId: grupo.loginId,
          aliases: grupo.aliases,
          documento: grupo.documento,
          tipoDocumento: grupo.tipoDocumento,
          nombres: grupo.nombres,
          telefono: grupo.telefono,
          email: grupo.email,
          hasCustomPassword: false,
          students: grupo.students,
          status: 'active',
          source: grupo.origen,
        });
        porLoginId.set(grupo.loginId, creado.toObject());
      }
    } else {
      claveInicial = existente.hasCustomPassword ? '(personalizada)' : grupo.loginId;

      const actuales = (existente.students || [])
        .map(String)
        .filter((id: string) => mongoose.isValidObjectId(id));
      const deseados = esManual
        ? unicos([...actuales, ...grupo.students.map(String)])
        : grupo.students.map(String).filter((id) => mongoose.isValidObjectId(id));

      const aliases = esManual
        ? unicos([...(existente.aliases || []), ...grupo.aliases])
        : unicos(grupo.aliases);

      const update: Record<string, unknown> = {};
      if (!mismoConjunto(actuales, deseados)) {
        update.students = deseados.map((id) => new mongoose.Types.ObjectId(id));
      }
      if (!mismoConjunto(existente.aliases || [], aliases)) {
        update.aliases = aliases;
      }

      if (esManual) {
        if (!existente.nombres && grupo.nombres) update.nombres = grupo.nombres;
        if (!existente.telefono && grupo.telefono) update.telefono = grupo.telefono;
        if (!existente.email && grupo.email) update.email = grupo.email;
        if (!existente.documento && grupo.documento) update.documento = grupo.documento;
        if (!existente.tipoDocumento && grupo.tipoDocumento) {
          update.tipoDocumento = grupo.tipoDocumento;
        }
      } else {
        const nombreEsRelleno = grupo.nombres.startsWith('APODERADO DE ');
        if (grupo.nombres && (!nombreEsRelleno || !existente.nombres)) {
          update.nombres = grupo.nombres;
        }
        if (grupo.telefono && grupo.telefono !== existente.telefono) {
          update.telefono = grupo.telefono;
        }
        if (grupo.email && grupo.email !== existente.email) {
          update.email = grupo.email;
        }
        if (grupo.documento && grupo.documento !== existente.documento) {
          update.documento = grupo.documento;
        }
        if (grupo.tipoDocumento && grupo.tipoDocumento !== existente.tipoDocumento) {
          update.tipoDocumento = grupo.tipoDocumento;
        }
      }

      if (Object.keys(update).length > 0) {
        actualizados++;
        if (!dryRun) {
          await Guardian.updateOne({ _id: existente._id }, { $set: update });
        }
      } else {
        sinCambios++;
      }
    }

    credenciales.push([
      grupo.loginId,
      claveInicial,
      grupo.nombres,
      grupo.telefono || '',
      grupo.email || '',
      grupo.nombresAlumnos.join(' | '),
      grupo.nombresAlumnos.length,
      grupo.aliases.join(' | '),
    ]);
  }

  const archivos: GuardianImportReport['archivos'] = {};

  if (generarCsv && !dryRun) {
    const carpeta = carpetaSalida
      ? path.resolve(carpetaSalida)
      : path.resolve(process.cwd(), 'backups', 'guardians');
    fs.mkdirSync(carpeta, { recursive: true });

    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const archivoCredenciales = path.join(carpeta, `credenciales-tutores-${marca}.csv`);
    escribirCsv(
      archivoCredenciales,
      ['loginId', 'claveInicial', 'nombres', 'telefono', 'email', 'alumnos', 'cantidadHijos', 'aliases'],
      credenciales
    );
    archivos.credenciales = archivoCredenciales;

    if (conflictos.length > 0) {
      const archivoConflictos = path.join(carpeta, `tutores-conflictos-${marca}.csv`);
      escribirCsv(archivoConflictos, ['detalle'], conflictos.map((detalle) => [detalle]));
      archivos.conflictos = archivoConflictos;
    }

    if (pendientes.length > 0) {
      const activo = await SchoolYear.findOne({ status: 'Activo' }).select('_id').lean();
      const idsPendientes = pendientes.map(({ student }) => student._id);
      const matriculas = await Enrollment.find({
        studentId: { $in: idsPendientes },
        ...(activo?._id ? { schoolYearId: activo._id } : {}),
      })
        .select('studentId sectionId')
        .lean();

      const idsSecciones = unicos(matriculas.map((m: any) => String(m.sectionId)))
        .filter((id) => mongoose.isValidObjectId(id));
      const secciones = await Section.find({ _id: { $in: idsSecciones } })
        .select('name')
        .lean();
      const nombreSeccion = new Map(
        (secciones as any[]).map((seccion) => [String(seccion._id), String(seccion.name)])
      );

      const seccionPorAlumno = new Map<string, string>();
      for (const matricula of matriculas as any[]) {
        const nombre = nombreSeccion.get(String(matricula.sectionId));
        if (nombre) seccionPorAlumno.set(String(matricula.studentId), nombre);
      }

      const archivoPendientes = path.join(carpeta, `tutores-pendientes-${marca}.csv`);
      escribirCsv(
        archivoPendientes,
        ['alumno', 'dni', 'codigoEstudiante', 'seccion', 'motivo'],
        pendientes.map(({ student, motivo }) => [
          `${student.firstName} ${student.lastName}`.trim(),
          student.dni || '',
          student.codigoEstudiante || '',
          seccionPorAlumno.get(String(student._id)) || '',
          motivo,
        ])
      );
      archivos.pendientes = archivoPendientes;
    }
  }

  return {
    estudiantes: estudiantes.length,
    familias: grupos.size,
    familiasConHermanos: [...grupos.values()].filter((g) => g.students.length > 1).length,
    creados,
    actualizados,
    sinCambios,
    pendientes: pendientes.length,
    conflictos,
    archivos,
  };
}
