import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  schoolYearId: mongoose.Types.ObjectId;
  level: string;
  enrollmentDate: Date;
  status: 'active' | 'inactive' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema: Schema = new Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El estudiante es requerido'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'La sección es requerida'],
    },
    schoolYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolYear',
      required: [true, 'El año escolar es requerido'],
    },
    level: {
      type: String,
      required: [true, 'El nivel es requerido'],
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

EnrollmentSchema.index({ studentId: 1, sectionId: 1, schoolYearId: 1 }, { unique: true });
EnrollmentSchema.index({ schoolYearId: 1 });
EnrollmentSchema.index({ sectionId: 1 });
EnrollmentSchema.index({ studentId: 1 });

const Enrollment = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

export default Enrollment;