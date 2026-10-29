import mongoose, { Schema, Document } from 'mongoose';

/**
 * Bien patrimonial del inventario institucional.
 * Los campos replican el Anexo 03-A del SBN (Inventario Físico de Bienes
 * Patrimoniales) usado por la I.E. Francisco López de Romaña.
 */
export interface IInventoryItem extends Document {
  codigoInterno: string;
  codigoSBNGeneral?: string;
  codigoSBNCorrelativo?: string;

  nombre: string;
  marca?: string;
  tipo?: string;
  modelo?: string;
  serieDimensiones?: string;
  color?: string;
  otros?: string;

  cantidad: number;
  unidadMedida: string;

  ubicacion?: string;
  ambiente?: mongoose.Types.ObjectId;

  estado?: 'B' | 'R' | 'N' | '';
  condicion?: string;
  tipoBien: 'activo_fijo' | 'bien_menor';

  fechaIngreso?: Date;
  entidadDependencia?: string;
  documentoSustentatorio?: string;
  fechaDocumento?: Date;

  cuenta?: string;
  subCuenta?: string;

  valorUnitario: number;
  valorTotal: number;

  anioInventario: number;
  notas?: string;

  /** Fila original del Excel (todas las celdas, para trazabilidad). */
  datosOriginales?: any[];

  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema(
  {
    codigoInterno: {
      type: String,
      required: [true, 'El código interno es requerido'],
      unique: true,
      trim: true,
    },
    codigoSBNGeneral: {
      type: String,
      trim: true,
      default: '',
    },
    codigoSBNCorrelativo: {
      type: String,
      trim: true,
      default: '',
    },

    nombre: {
      type: String,
      required: [true, 'El nombre del bien es requerido'],
      trim: true,
    },
    marca: { type: String, trim: true, default: '' },
    tipo: { type: String, trim: true, default: '' },
    modelo: { type: String, trim: true, default: '' },
    serieDimensiones: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    otros: { type: String, trim: true, default: '' },

    cantidad: {
      type: Number,
      default: 1,
      min: [0, 'La cantidad no puede ser negativa'],
    },
    unidadMedida: {
      type: String,
      trim: true,
      default: 'UND',
    },

    ubicacion: { type: String, trim: true, default: '' },
    ambiente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryAmbiente',
    },

    estado: {
      type: String,
      enum: ['B', 'R', 'N', ''],
      default: '',
    },
    condicion: { type: String, trim: true, default: '' },
    tipoBien: {
      type: String,
      enum: ['activo_fijo', 'bien_menor'],
      default: 'activo_fijo',
    },

    fechaIngreso: { type: Date },
    entidadDependencia: { type: String, trim: true, default: '' },
    documentoSustentatorio: { type: String, trim: true, default: '' },
    fechaDocumento: { type: Date },

    cuenta: { type: String, trim: true, default: '' },
    subCuenta: { type: String, trim: true, default: '' },

    valorUnitario: { type: Number, default: 0, min: 0 },
    valorTotal: { type: Number, default: 0, min: 0 },

    anioInventario: { type: Number, default: () => new Date().getFullYear() },
    notas: { type: String, trim: true, default: '' },

    datosOriginales: {
      type: [Schema.Types.Mixed],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

InventoryItemSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// `codigoInterno` ya tiene índice por `unique: true`.
InventoryItemSchema.index({ codigoSBNGeneral: 1 });
InventoryItemSchema.index({ nombre: 1 });
InventoryItemSchema.index({ ambiente: 1 });
InventoryItemSchema.index({ estado: 1 });
InventoryItemSchema.index({ tipoBien: 1 });
InventoryItemSchema.index({ anioInventario: 1 });

const InventoryItem = mongoose.model<IInventoryItem>(
  'InventoryItem',
  InventoryItemSchema
);

export default InventoryItem;
