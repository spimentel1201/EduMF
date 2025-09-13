import mongoose, { Schema, Document } from 'mongoose';

interface IAttendanceDetail {
  studentId: mongoose.Types.ObjectId;
  status: 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';
  notes?: string;
}

export interface IAttendance extends Document {
  date: Date;
  sectionId: mongoose.Types.ObjectId;
  courseScheduleId: mongoose.Types.ObjectId;
  presentCount: number;
  absentCount: number;
  teacherId: mongoose.Types.ObjectId;
  status: 'Pendiente' | 'Tomada' | 'Finalizada';
  notes?: string;
  details: IAttendanceDetail[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    date: {
      type: Date,
      required: [true, 'La fecha es requerida'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'La sección es requerida'],
    },
    courseScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSchedule',
      required: [true, 'El horario del curso es requerido'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'El docente es requerido'],
    },
    status: {
      type: String,
      enum: ['Pendiente', 'Tomada', 'Finalizada'],
      default: 'Pendiente',
    },
    notes: {
      type: String,
      trim: true,
    },
    details: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      status: {
        type: String,
        enum: ['Presente', 'Tardanza', 'Ausente', 'Justificado'],
        required: true,
      },
      notes: {
        type: String,
        trim: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
AttendanceSchema.index({ date: 1, sectionId: 1, courseScheduleId: 1 });
AttendanceSchema.index({ teacherId: 1, date: 1 });

const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;