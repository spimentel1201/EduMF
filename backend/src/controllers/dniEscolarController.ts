import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import DniEscolar from '../models/DniEscolar';
import Enrollment from '../models/Enrollment';
import User from '../models/User';
import { ApiError } from '../middleware/errorHandler';

const CUI_REGEX = /^[0-9A-Z]{6,15}$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Fecha de caducidad por defecto: emisión + 3 años. */
function calcularCaducidad(emision: Date): Date {
  const caducidad = new Date(emision);
  caducidad.setFullYear(caducidad.getFullYear() + 3);
  return caducidad;
}

function buildQuery(req: Request): any {
  const query: any = {};

  const sexo = req.query.sexo as string;
  const anio = req.query.anio as string;
  const conFoto = req.query.conFoto as string;
  const studentId = req.query.studentId as string;
  const search = req.query.search as string;

  if (sexo === 'M' || sexo === 'F') query.sexo = sexo;
  if (anio) query.anio = Number(anio);
  if (studentId && mongoose.isValidObjectId(studentId)) query.studentId = studentId;

  if (conFoto === 'si') query.fotoBase64 = { $exists: true, $ne: '' };
  if (conFoto === 'no') {
    query.$or = [{ fotoBase64: { $exists: false } }, { fotoBase64: '' }];
  }

  if (search) {
    const term = escapeRegex(search);
    query.$and = [
      {
        $or: [
          { cui: { $regex: term, $options: 'i' } },
          { primerApellido: { $regex: term, $options: 'i' } },
          { segundoApellido: { $regex: term, $options: 'i' } },
          { preNombres: { $regex: term, $options: 'i' } },
        ],
      },
    ];
    // Si además se pedía "sin foto", combinamos ambos filtros sin pisarse.
    if (conFoto !== 'si') delete query.$or;
  }

  return query;
}

/**
 * @desc    Listar DNIs escolares (paginado + filtros)
 * @route   GET /api/dni-escolar
 */
export const getAllDnis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const startIndex = (page - 1) * limit;
    const query = buildQuery(req);

    const total = await DniEscolar.countDocuments(query);
    const dnis = await DniEscolar.find(query)
      .sort({ primerApellido: 1, preNombres: 1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: dnis.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data: dnis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un DNI escolar por ID
 * @route   GET /api/dni-escolar/:id
 */
export const getDniById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dni = await DniEscolar.findById(req.params.id);
    if (!dni) {
      return next(ApiError.notFound('DNI escolar no encontrado'));
    }
    res.status(200).json({ success: true, data: dni });
  } catch (error) {
    next(error);
  }
};

function prepararFechas(body: any): void {
  const emision = body.fechaEmision ? new Date(body.fechaEmision) : new Date();
  body.fechaEmision = emision;
  if (!body.fechaInscripcion) body.fechaInscripcion = emision;
  if (!body.fechaCaducidad) body.fechaCaducidad = calcularCaducidad(emision);
  if (!body.anio) body.anio = new Date().getFullYear();
}

function manejarDuplicado(error: any, next: NextFunction): boolean {
  if (error && (error.code === 11000 || String(error.message || '').includes('duplicate key'))) {
    next(ApiError.badRequest('El CUI ya está registrado en el sistema'));
    return true;
  }
  return false;
}

/**
 * @desc    Crear un DNI escolar
 * @route   POST /api/dni-escolar
 */
export const createDni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const body = { ...req.body };
    body.cui = String(body.cui || '').trim().toUpperCase();
    prepararFechas(body);

    const dni = await DniEscolar.create(body);
    res.status(201).json({ success: true, data: dni });
  } catch (error) {
    if (!manejarDuplicado(error, next)) next(error);
  }
};

/**
 * @desc    Actualizar un DNI escolar
 * @route   PUT /api/dni-escolar/:id
 */
export const updateDni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const body = { ...req.body };
    if (body.cui !== undefined) body.cui = String(body.cui || '').trim().toUpperCase();

    const dni = await DniEscolar.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!dni) {
      return next(ApiError.notFound('DNI escolar no encontrado'));
    }

    res.status(200).json({ success: true, data: dni });
  } catch (error) {
    if (!manejarDuplicado(error, next)) next(error);
  }
};

/**
 * @desc    Eliminar un DNI escolar
 * @route   DELETE /api/dni-escolar/:id
 */
export const deleteDni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dni = await DniEscolar.findByIdAndDelete(req.params.id);
    if (!dni) {
      return next(ApiError.notFound('DNI escolar no encontrado'));
    }
    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Estadísticas de DNIs escolares
 * @route   GET /api/dni-escolar/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const total = await DniEscolar.countDocuments({});
    const conFoto = await DniEscolar.countDocuments({ fotoBase64: { $exists: true, $ne: '' } });
    const porAnio = await DniEscolar.aggregate([
      { $group: { _id: '$anio', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        conFoto,
        sinFoto: total - conFoto,
        porAnio,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generar DNIs escolares desde la matrícula de una sección
 * @route   POST /api/dni-escolar/generar
 * @body    { sectionId, studentIds?, anio?, departamento?, provincia?, distrito?, direccion? }
 *
 * Prefill desde User/Enrollment:
 *  - cui = DNI del usuario (si no tiene, se omite con motivo)
 *  - preNombres = firstName
 *  - apellidos = lastName dividido (1er token = primer apellido)
 *  - sexo = gender M/F (O u otro -> M)
 *  - fechaNacimiento = birthdate
 *  - fechas: inscripción = emisión = hoy; caducidad = +3 años
 * No sobrescribe DNIs ya existentes (mismo cui o mismo studentId).
 */
export const generarDesdeMatricula = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId, studentIds, anio, departamento, provincia, distrito, direccion } = req.body;

    if (!sectionId || !mongoose.isValidObjectId(sectionId)) {
      return next(ApiError.badRequest('La sección es requerida'));
    }

    const enrollments = await Enrollment.find({ sectionId })
      .populate('studentId', 'firstName lastName dni gender birthdate role status')
      .lean();

    const solicitados = Array.isArray(studentIds) && studentIds.length > 0
      ? new Set(studentIds.map(String))
      : null;

    const existentes = await DniEscolar.find({}, 'cui studentId').lean();
    const cuiSet = new Set(existentes.map((d) => d.cui));
    const studentSet = new Set(existentes.map((d) => String(d.studentId ?? '')));

    const emision = new Date();
    const creados: any[] = [];
    const omitidos: { nombre: string; motivo: string }[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      if (!student) continue;
      if (solicitados && !solicitados.has(String(student._id))) continue;

      const nombre = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim();

      if (student.role !== 'student') {
        omitidos.push({ nombre, motivo: 'No es un estudiante matriculado' });
        continue;
      }

      const cui = String(student.dni || '').trim().toUpperCase();
      if (!CUI_REGEX.test(cui)) {
        omitidos.push({ nombre, motivo: cui ? 'DNI inválido' : 'El estudiante no tiene DNI registrado' });
        continue;
      }

      if (cuiSet.has(cui) || studentSet.has(String(student._id))) {
        omitidos.push({ nombre, motivo: 'Ya tiene un DNI escolar generado' });
        continue;
      }

      const lastName = String(student.lastName || '').trim();
      const tokens = lastName.split(/\s+/).filter(Boolean);
      const primerApellido = tokens[0] || '';
      const segundoApellido = tokens.slice(1).join(' ');

      if (!primerApellido) {
        omitidos.push({ nombre, motivo: 'El estudiante no tiene apellidos registrados' });
        continue;
      }

      const creado = await DniEscolar.create({
        cui,
        primerApellido,
        segundoApellido,
        preNombres: String(student.firstName || '').trim(),
        sexo: student.gender === 'F' ? 'F' : 'M',
        fechaNacimiento: student.birthdate || undefined,
        departamento: departamento || '',
        provincia: provincia || '',
        distrito: distrito || '',
        direccion: direccion || '',
        donacionOrganos: 'No',
        studentId: student._id,
        anio: Number(anio) || emision.getFullYear(),
        fechaInscripcion: emision,
        fechaEmision: emision,
        fechaCaducidad: calcularCaducidad(emision),
      });

      cuiSet.add(cui);
      studentSet.add(String(student._id));
      creados.push(creado);
    }

    res.status(201).json({
      success: true,
      data: {
        creados: creados.length,
        omitidos,
        dnis: creados,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cargar fotos en lote emparejadas por CUI
 * @route   POST /api/dni-escolar/fotos
 * @body    { fotos: [{ cui, fotoBase64 }] }
 */
export const subirFotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fotos = Array.isArray(req.body?.fotos) ? req.body.fotos : [];
    if (fotos.length === 0) {
      return next(ApiError.badRequest('No se enviaron fotos'));
    }
    if (fotos.length > 500) {
      return next(ApiError.badRequest('Máximo 500 fotos por lote'));
    }

    let actualizadas = 0;
    const noEncontradas: string[] = [];
    const invalidas: string[] = [];

    for (const foto of fotos) {
      const cui = String(foto?.cui || '').trim().toUpperCase();
      const data = String(foto?.fotoBase64 || '');

      if (!CUI_REGEX.test(cui) || !data.startsWith('data:image/')) {
        invalidas.push(cui || '(sin cui)');
        continue;
      }

      const result = await DniEscolar.updateOne(
        { cui },
        { $set: { fotoBase64: data } }
      );

      if (result.matchedCount > 0) {
        actualizadas += 1;
      } else {
        noEncontradas.push(cui);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalEnviadas: fotos.length,
        actualizadas,
        noEncontradas,
        invalidas,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Datos para imprimir DNIs (hasta 200)
 * @route   GET /api/dni-escolar/print?ids=id1,id2
 */
export const getPrintData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => mongoose.isValidObjectId(id))
      .slice(0, 200);

    if (ids.length === 0) {
      return next(ApiError.badRequest('Selecciona al menos un estudiante para imprimir'));
    }

    const dnis = await DniEscolar.find({ _id: { $in: ids } }).sort({
      primerApellido: 1,
      preNombres: 1,
    });

    res.status(200).json({ success: true, data: dnis });
  } catch (error) {
    next(error);
  }
};
