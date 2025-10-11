import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceDetail extends Document {
  attendanceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceDetailSchema: Schema = new Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: [true, 'El registro de asistencia es requerido'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El estudiante es requerido'],
    },
    status: {
      type: String,
      enum: ['Presente', 'Ausente', 'Tardanza', 'Justificado'],
      default: 'Presente',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceDetailSchema.index({ attendanceId: 1, studentId: 1 }, { unique: true });
AttendanceDetailSchema.index({ status: 1 });

const AttendanceDetail = mongoose.model<IAttendanceDetail>('AttendanceDetail', AttendanceDetailSchema);

export default AttendanceDetail;