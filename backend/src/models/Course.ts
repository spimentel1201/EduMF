import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  description: string;
  level: string;
  grade: number;
  credits: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del curso es requerido'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'El código del curso es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
    },
    level: {
      type: String,
      enum: ['Inicial', 'Primaria', 'Secundaria'],
      required: [true, 'El nivel educativo es requerido'],
    },
    grade: {
      type: Number,
      required: [true, 'El grado es requerido'],
      min: [1, 'El grado debe ser al menos 1'],
      max: [6, 'El grado no puede ser mayor a 6'],
    },
    credits: {
      type: Number,
      required: [true, 'Los créditos son requeridos'],
      min: [1, 'Los créditos deben ser al menos 1'],
    },
    status: {
      type: String,
      enum: ['Activo', 'Inactivo'],
      default: 'Activo',
    },
  },
  {
    timestamps: true,
  }
);

// Transform para convertir _id a id
CourseSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Índices para búsquedas eficientes
CourseSchema.index({ code: 1 });
CourseSchema.index({ level: 1, grade: 1 });
CourseSchema.index({ status: 1 });

const Course = mongoose.model<ICourse>('Course', CourseSchema);

export default Course;