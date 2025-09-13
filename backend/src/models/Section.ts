import mongoose, { Schema, Document } from 'mongoose';

export interface ISection extends Document {
  name: string;
  level: string;
  grade: number;
  section: string;
  maxStudents: number;
  currentStudents: number;
  schoolYearId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la sección es requerido'],
      trim: true,
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
    section: {
      type: String,
      required: [true, 'La sección es requerida'],
      trim: true,
      uppercase: true,
    },
    maxStudents: {
      type: Number,
      required: [true, 'El número máximo de estudiantes es requerido'],
      min: [1, 'Debe haber al menos 1 estudiante'],
    },
    currentStudents: {
      type: Number,
      default: 0,
    },
    schoolYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolYear',
      required: [true, 'El año escolar es requerido'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
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
SectionSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Índices para búsquedas eficientes
SectionSchema.index({ schoolYearId: 1 });
SectionSchema.index({ level: 1, grade: 1, section: 1 });
SectionSchema.index({ teacherId: 1 });

const Section = mongoose.model<ISection>('Section', SectionSchema);

export default Section;