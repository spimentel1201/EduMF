import mongoose, { Schema, Document } from 'mongoose';

/**
 * Ambiente / espacio físico donde se ubican los bienes patrimoniales.
 * Ej: AULA 1A, AUDITORIO, BIBLIOTECA, LABORATORIO DE CT...
 */
export interface IInventoryAmbiente extends Document {
  nombre: string;
  codigo?: string;
  tipo?: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryAmbienteSchema: Schema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del ambiente es requerido'],
      unique: true,
      trim: true,
    },
    codigo: {
      type: String,
      trim: true,
      default: '',
    },
    tipo: {
      type: String,
      trim: true,
      default: 'Aula',
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

InventoryAmbienteSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// `nombre` ya tiene índice por `unique: true`.
InventoryAmbienteSchema.index({ activo: 1 });

const InventoryAmbiente = mongoose.model<IInventoryAmbiente>(
  'InventoryAmbiente',
  InventoryAmbienteSchema
);

export default InventoryAmbiente;
