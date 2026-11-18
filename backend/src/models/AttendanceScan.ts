import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceScanType = 'entrada' | 'salida';
export type AttendanceScanSource = 'online' | 'offline';

/**
 * Registro idempotente de cada escaneo QR.
 *
 * `clientScanId` lo genera el dispositivo. Si la cola offline reenvía el mismo
 * escaneo, el backend devuelve el resultado existente en vez de duplicarlo.
 * `scannedAt` es la hora real del escaneo; `receivedAt` la de llegada.
 */
export interface IAttendanceScan extends Document {
  clientScanId: string;
  studentId: mongoose.Types.ObjectId;
  tipo: AttendanceScanType;
  scannedAt: Date;
  receivedAt: Date;
  attendanceId: mongoose.Types.ObjectId;
  source: AttendanceScanSource;
  clockSkewMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceScanSchema: Schema = new Schema(
  {
    clientScanId: {
      type: String,
      required: [true, 'El identificador del escaneo es requerido'],
      unique: true,
      trim: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tipo: {
      type: String,
      enum: ['entrada', 'salida'],
      required: true,
    },
    scannedAt: {
      type: Date,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
    },
    source: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    clockSkewMinutes: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceScanSchema.index({ studentId: 1, scannedAt: -1 });
AttendanceScanSchema.index({ attendanceId: 1 });

AttendanceScanSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AttendanceScan = mongoose.model<IAttendanceScan>(
  'AttendanceScan',
  AttendanceScanSchema
);

export default AttendanceScan;
