import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceAuditAction =
  | 'marcar'
  | 'corregir'
  | 'justificar'
  | 'quitar_justificacion';

export interface AttendanceAuditSnapshot {
  status?: string;
  notes?: string;
  horaEntrada?: Date;
  horaSalida?: Date;
}

/**
 * Auditoría de cambios de asistencia (no registra consultas).
 *
 * Toda corrección o justificación debe dejar el estado anterior y posterior,
 * el actor y el motivo. La UI no decide la validez: solo muestra el resultado.
 */
export interface IAttendanceAuditLog extends Document {
  attendanceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: AttendanceAuditAction;
  before: AttendanceAuditSnapshot;
  after: AttendanceAuditSnapshot;
  reason?: string;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SnapshotSchema = new Schema<AttendanceAuditSnapshot>(
  {
    status: { type: String, trim: true },
    notes: { type: String, trim: true },
    horaEntrada: { type: Date },
    horaSalida: { type: Date },
  },
  { _id: false }
);

const AttendanceAuditLogSchema: Schema = new Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ['marcar', 'corregir', 'justificar', 'quitar_justificacion'],
      required: true,
    },
    before: {
      type: SnapshotSchema,
      default: () => ({}),
    },
    after: {
      type: SnapshotSchema,
      default: () => ({}),
    },
    reason: {
      type: String,
      trim: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceAuditLogSchema.index({ attendanceId: 1, at: -1 });
AttendanceAuditLogSchema.index({ studentId: 1, at: -1 });
AttendanceAuditLogSchema.index({ actorId: 1, at: -1 });

AttendanceAuditLogSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AttendanceAuditLog = mongoose.model<IAttendanceAuditLog>(
  'AttendanceAuditLog',
  AttendanceAuditLogSchema
);

export default AttendanceAuditLog;
