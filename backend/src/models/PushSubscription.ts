import mongoose, { Schema, Document } from 'mongoose';

/**
 * Suscripción Web Push de un tutor.
 *
 * Se permiten como máximo 2 activas por tutor; al registrar una tercera se
 * revoca la de `lastUsedAt` más antiguo (lo aplica `pushService`).
 */
export interface IPushSubscription extends Document {
  guardianId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceLabel?: string;
  userAgent?: string;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema: Schema = new Schema(
  {
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: [true, 'El tutor es requerido'],
    },
    endpoint: {
      type: String,
      required: [true, 'El endpoint de la suscripción es requerido'],
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'La clave p256dh es requerida'],
      },
      auth: {
        type: String,
        required: [true, 'La clave auth es requerida'],
      },
    },
    deviceLabel: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    lastUsedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PushSubscriptionSchema.index({ guardianId: 1, revokedAt: 1 });
PushSubscriptionSchema.index({ lastUsedAt: 1 });

PushSubscriptionSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const PushSubscription = mongoose.model<IPushSubscription>(
  'PushSubscription',
  PushSubscriptionSchema
);

export default PushSubscription;
