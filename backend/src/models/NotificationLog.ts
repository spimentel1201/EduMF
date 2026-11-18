import mongoose, { Schema, Document } from 'mongoose';

export type NotificationAudience = 'guardian' | 'staff';
export type NotificationType =
  | 'entrada'
  | 'tardanza'
  | 'salida'
  | 'sin_registro'
  | 'falta'
  | 'justificacion'
  | 'reincidencia';
export type NotificationStatus = 'sent' | 'failed' | 'skipped';

/**
 * Historial de notificaciones emitidas (y de las omitidas por deduplicación).
 *
 * `dedupeKey` es único y evita avisos repetidos, por ejemplo una tardanza que
 * se reenvía cada vez que el alumno vuelve a escanear.
 */
export interface INotificationLog extends Document {
  audience: NotificationAudience;
  guardianId?: mongoose.Types.ObjectId;
  staffRoles?: string[];
  studentId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  dedupeKey: string;
  status: NotificationStatus;
  error?: string;
  sentAt: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema: Schema = new Schema(
  {
    audience: {
      type: String,
      enum: ['guardian', 'staff'],
      required: true,
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
    },
    staffRoles: {
      type: [String],
      default: undefined,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['entrada', 'tardanza', 'salida', 'sin_registro', 'falta', 'justificacion', 'reincidencia'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'sent',
    },
    error: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

NotificationLogSchema.index({ guardianId: 1, sentAt: -1 });
NotificationLogSchema.index({ studentId: 1, type: 1, sentAt: -1 });
NotificationLogSchema.index({ audience: 1, sentAt: -1 });

NotificationLogSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const NotificationLog = mongoose.model<INotificationLog>(
  'NotificationLog',
  NotificationLogSchema
);

export default NotificationLog;
