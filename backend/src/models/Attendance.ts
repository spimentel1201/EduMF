import mongoose, { Schema, Document } from 'mongoose';

interface IAttendanceDetail {
  studentId: mongoose.Types.ObjectId;
  status: 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';
  notes?: string;
  /** Hora de entrada del estudiante (registro QR en modo entrada). */
  horaEntrada?: Date;
  /** Hora de salida del estudiante (registro QR en modo salida). */
  horaSalida?: Date;
}

export interface IAttendance extends Document {
  date: Date;
  sectionId: mongoose.Types.ObjectId;
  /** Opcional desde D1: hay secciones sin horario configurado. */
  courseScheduleId?: mongoose.Types.ObjectId;
  presentCount: number;
  absentCount: number;
  /** Opcional: el registro diario por sección puede no tener docente asignado. */
  teacherId?: mongoose.Types.ObjectId;
  status: 'Pendiente' | 'Tomada' | 'Finalizada';
  /** true = registro diario por sección (sin horario). */
  diario: boolean;
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
      required: false,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: false,
    },
    status: {
      type: String,
      enum: ['Pendiente', 'Tomada', 'Finalizada'],
      default: 'Pendiente',
    },
    diario: {
      type: Boolean,
      default: false,
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
      horaEntrada: {
        type: Date,
      },
      horaSalida: {
        type: Date,
      },
    }],
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ date: 1, sectionId: 1, courseScheduleId: 1 });
AttendanceSchema.index({ teacherId: 1, date: 1 });
// Un solo registro diario por sección cuando no hay horario (D1). Los registros
// ligados a un CourseSchedule conservan su propio índice y no entran aquí.
AttendanceSchema.index(
  { sectionId: 1, date: 1 },
  { unique: true, partialFilterExpression: { diario: true } }
);

const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;