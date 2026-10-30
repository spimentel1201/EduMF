import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import InventoryItem from '../models/InventoryItem';
import InventoryAmbiente from '../models/InventoryAmbiente';
import { ApiError } from '../middleware/errorHandler';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://edu-mf.vercel.app';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatCodigoInterno(anio: number, correlativo: number): string {
  return `INV-${anio}-${String(correlativo).padStart(4, '0')}`;
}

/**
 * Devuelve el siguiente correlativo disponible para un año dado.
 * Se usa tanto en la creación individual como en la importación masiva.
 */
export async function getNextCodigoCorrelativo(anio: number): Promise<number> {
  const prefix = `INV-${anio}-`;
  const last = await InventoryItem.findOne({
    codigoInterno: { $regex: `^${escapeRegex(prefix)}` },
  })
    .sort({ codigoInterno: -1 })
    .select('codigoInterno')
    .lean();

  if (last?.codigoInterno) {
    const parsed = parseInt(last.codigoInterno.slice(prefix.length), 10);
    if (!Number.isNaN(parsed)) return parsed + 1;
  }
  return 1;
}

async function resolveAmbiente(data: any): Promise<mongoose.Types.ObjectId | undefined> {
  if (data.ambiente && mongoose.isValidObjectId(data.ambiente)) {
    return new mongoose.Types.ObjectId(String(data.ambiente));
  }

  const nombre = String(data.ubicacion || data.ambienteNombre || '').trim();
  if (!nombre) return undefined;

  const ambiente = await InventoryAmbiente.findOneAndUpdate(
    { nombre: new RegExp(`^${escapeRegex(nombre)}$`, 'i') },
    { $setOnInsert: { nombre, activo: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ambiente?._id as mongoose.Types.ObjectId;
}

function buildQuery(req: Request): any {
  const query: any = {};

  const ambiente = req.query.ambiente as string;
  const estado = req.query.estado as string;
  const tipoBien = req.query.tipoBien as string;
  const anio = req.query.anio as string;
  const search = req.query.search as string;

  if (ambiente && mongoose.isValidObjectId(ambiente)) query.ambiente = ambiente;
  if (estado) query.estado = estado;
  if (tipoBien) query.tipoBien = tipoBien;
  if (anio) query.anioInventario = Number(anio);

  if (search) {
    // Escapamos el término para que un carácter especial no invalide la regex.
    const term = escapeRegex(search);
    query.$or = [
      { nombre: { $regex: term, $options: 'i' } },
      { codigoInterno: { $regex: term, $options: 'i' } },
      { codigoSBNGeneral: { $regex: term, $options: 'i' } },
      { marca: { $regex: term, $options: 'i' } },
      { modelo: { $regex: term, $options: 'i' } },
      { serieDimensiones: { $regex: term, $options: 'i' } },
      { ubicacion: { $regex: term, $options: 'i' } },
    ];
  }

  return query;
}

/**
 * @desc    Listar bienes del inventario (paginado + filtros)
 * @route   GET /api/inventory
 */
export const getAllItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const startIndex = (page - 1) * limit;
    const query = buildQuery(req);

    const total = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .populate('ambiente', 'nombre tipo')
      .sort({ codigoInterno: 1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un bien por ID
 * @route   GET /api/inventory/:id
 */
export const getItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findById(req.params.id).populate(
      'ambiente',
      'nombre tipo'
    );

    if (!item) {
      return next(ApiError.notFound('Bien del inventario no encontrado'));
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear un bien del inventario
 * @route   POST /api/inventory
 */
export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const body = { ...req.body };
    const anio = Number(body.anioInventario) || new Date().getFullYear();

    if (!body.codigoInterno) {
      const correlativo = await getNextCodigoCorrelativo(anio);
      body.codigoInterno = formatCodigoInterno(anio, correlativo);
    }

    const ambiente = await resolveAmbiente(body);
    if (ambiente) body.ambiente = ambiente;

    if (body.valorTotal === undefined || body.valorTotal === null || body.valorTotal === '') {
      body.valorTotal = (Number(body.cantidad) || 0) * (Number(body.valorUnitario) || 0);
    }

    const item = await InventoryItem.create(body);
    await item.populate('ambiente', 'nombre tipo');

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar un bien del inventario
 * @route   PUT /api/inventory/:id
 */
export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const body = { ...req.body };

    const ambiente = await resolveAmbiente(body);
    if (ambiente) body.ambiente = ambiente;

    if (body.valorTotal === undefined || body.valorTotal === null || body.valorTotal === '') {
      if (body.cantidad !== undefined || body.valorUnitario !== undefined) {
        const current = await InventoryItem.findById(req.params.id).lean();
        if (!current) return next(ApiError.notFound('Bien del inventario no encontrado'));
        const cantidad = body.cantidad !== undefined ? Number(body.cantidad) || 0 : current.cantidad || 0;
        const unitario =
          body.valorUnitario !== undefined ? Number(body.valorUnitario) || 0 : current.valorUnitario || 0;
        body.valorTotal = cantidad * unitario;
      }
    }

    const item = await InventoryItem.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).populate('ambiente', 'nombre tipo');

    if (!item) {
      return next(ApiError.notFound('Bien del inventario no encontrado'));
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar un bien del inventario
 * @route   DELETE /api/inventory/:id
 */
export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return next(ApiError.notFound('Bien del inventario no encontrado'));
    }
    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Estadísticas generales del inventario
 * @route   GET /api/inventory/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totals] = await InventoryItem.aggregate([
      {
        $group: {
          _id: null,
          totalBienes: { $sum: 1 },
          totalUnidades: { $sum: '$cantidad' },
          valorTotal: { $sum: '$valorTotal' },
        },
      },
    ]);

    const porEstado = await InventoryItem.aggregate([
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]);

    const porAmbiente = await InventoryItem.aggregate([
      { $group: { _id: '$ambiente', count: { $sum: 1 }, valor: { $sum: '$valorTotal' } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'inventoryambientes',
          localField: '_id',
          foreignField: '_id',
          as: 'ambienteDoc',
        },
      },
      {
        $project: {
          _id: 0,
          ambiente: { $ifNull: [{ $arrayElemAt: ['$ambienteDoc.nombre', 0] }, 'Sin ambiente'] },
          count: 1,
          valor: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBienes: totals?.totalBienes || 0,
        totalUnidades: totals?.totalUnidades || 0,
        valorTotal: totals?.valorTotal || 0,
        porEstado,
        porAmbiente,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar ambientes (para filtros y formularios)
 * @route   GET /api/inventory/ambientes
 */
export const getAmbientes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ambientes = await InventoryAmbiente.find({ activo: true }).sort({ nombre: 1 });
    res.status(200).json({ success: true, data: ambientes });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear un ambiente
 * @route   POST /api/inventory/ambientes
 */
export const createAmbiente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    if (!nombre) {
      return next(ApiError.badRequest('El nombre del ambiente es requerido'));
    }

    const ambiente = await InventoryAmbiente.create({
      nombre,
      codigo: req.body.codigo || '',
      tipo: req.body.tipo || 'Aula',
      descripcion: req.body.descripcion || '',
    });

    res.status(201).json({ success: true, data: ambiente });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Información pública de un bien (consumida al escanear el QR, sin login)
 * @route   GET /api/inventory/public/:codigoInterno
 */
export const getPublicItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findOne({
      codigoInterno: req.params.codigoInterno,
    })
      .select(
        'codigoInterno codigoSBNGeneral codigoSBNCorrelativo nombre marca modelo serieDimensiones color cantidad unidadMedida ubicacion estado condicion tipoBien anioInventario'
      )
      .populate('ambiente', 'nombre tipo');

    if (!item) {
      return next(ApiError.notFound('Bien del inventario no encontrado'));
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Datos para imprimir etiquetas (incluye QR en data URL)
 * @route   GET /api/inventory/labels?ids=id1,id2
 */
export const getLabels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => mongoose.isValidObjectId(id))
      .slice(0, 200);

    if (ids.length === 0) {
      return next(ApiError.badRequest('Selecciona al menos un bien para generar etiquetas'));
    }

    const items = await InventoryItem.find({ _id: { $in: ids } })
      .populate('ambiente', 'nombre tipo')
      .sort({ codigoInterno: 1 });

    const data = await Promise.all(
      items.map(async (item) => {
        const qrPayload = `${FRONTEND_URL}/inventario/publico/${encodeURIComponent(
          item.codigoInterno
        )}`;
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: 'M',
        });

        return {
          id: item.id,
          codigoInterno: item.codigoInterno,
          codigoSBN: [item.codigoSBNGeneral, item.codigoSBNCorrelativo]
            .filter(Boolean)
            .join(' · '),
          nombre: item.nombre,
          ambiente:
            (item.ambiente as any)?.nombre || item.ubicacion || 'Sin ambiente',
          estado: item.estado,
          anioInventario: item.anioInventario,
          qrDataUrl,
        };
      })
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
