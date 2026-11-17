import mongoose, { Schema, Document } from 'mongoose';

/**
 * DNI Escolar (DIE) — Documento de Identidad Escolar de la I.E.
 *
 * `cui` normalmente es el DNI de 8 dígitos del estudiante, pero también
 * acepta códigos de matrícula más largos (6–15 caracteres alfanuméricos).
 * El diseño de la tarjeta se auto-ajusta al largo del código.
 */
export interface IDniEscolar extends Document {
  cui: string;
  primerApellido: string;
  segundoApellido?: string;
  preNombres: string;
  sexo: 'M' | 'F';
  fechaNacimiento?: Date;
  ubigeoNacimiento?: string;

  fotoBase64?: string;

  fechaInscripcion?: Date;
  fechaEmision?: Date;
  fechaCaducidad?: Date;

  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  observaciones?: string;
  donacionOrganos: 'Si' | 'No';

  studentId?: mongoose.Types.ObjectId;
  anio: number;
  notas?: string;

  createdAt: Date;
  updatedAt: Date;
}

const DniEscolarSchema: Schema = new Schema(
  {
    cui: {
      type: String,
      required: [true, 'El CUI es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[0-9A-Z]{6,15}$/, 'El CUI debe tener entre 6 y 15 caracteres alfanuméricos'],
    },
    primerApellido: {
      type: String,
      required: [true, 'El primer apellido es requerido'],
      trim: true,
      uppercase: true,
    },
    segundoApellido: { type: String, trim: true, default: '', uppercase: true },
    preNombres: {
      type: String,
      required: [true, 'Los pre-nombres son requeridos'],
      trim: true,
      uppercase: true,
    },
    sexo: {
      type: String,
      enum: ['M', 'F'],
      default: 'M',
    },
    fechaNacimiento: { type: Date },
    ubigeoNacimiento: { type: String, trim: true, default: '' },

    fotoBase64: { type: String, default: '' },

    fechaInscripcion: { type: Date },
    fechaEmision: { type: Date },
    fechaCaducidad: { type: Date },

    departamento: { type: String, trim: true, default: '' },
    provincia: { type: String, trim: true, default: '' },
    distrito: { type: String, trim: true, default: '' },
    direccion: { type: String, trim: true, default: '' },
    observaciones: { type: String, trim: true, default: '' },
    donacionOrganos: {
      type: String,
      enum: ['Si', 'No'],
      default: 'No',
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    anio: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    notas: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
  }
);

DniEscolarSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// `cui` ya tiene índice por `unique: true`.
DniEscolarSchema.index({ anio: 1 });
DniEscolarSchema.index({ studentId: 1 });
DniEscolarSchema.index({ primerApellido: 1 });

const DniEscolar = mongoose.model<IDniEscolar>('DniEscolar', DniEscolarSchema);

export default DniEscolar;
