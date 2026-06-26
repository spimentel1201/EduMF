import mongoose, { Schema, Document } from 'mongoose';

export type CashRegisterStatus = 'ABIERTA' | 'CERRADA';

export interface ICashRegister extends Document {
  openedByUserId: mongoose.Types.ObjectId;
  closedByUserId?: mongoose.Types.ObjectId;
  openedAt: Date;
  closedAt?: Date;
  initialBalance: mongoose.Types.Decimal128;
  expectedBalance: mongoose.Types.Decimal128;
  realBalance?: mongoose.Types.Decimal128;
  status: CashRegisterStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CashRegisterSchema = new Schema<ICashRegister>(
  {
    openedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario que abre la caja es requerido'],
    },
    closedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    openedAt: {
      type: Date,
      required: [true, 'La fecha de apertura es requerida'],
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    initialBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'El saldo inicial es requerido'],
    },
    expectedBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'El saldo esperado es requerido'],
    },
    realBalance: {
      type: mongoose.Schema.Types.Decimal128,
    },
    status: {
      type: String,
      enum: ['ABIERTA', 'CERRADA'],
      default: 'ABIERTA',
    },
  },
  { timestamps: true }
);

CashRegisterSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.initialBalance) ret.initialBalance = ret.initialBalance.toString();
    if (ret.expectedBalance) ret.expectedBalance = ret.expectedBalance.toString();
    if (ret.realBalance) ret.realBalance = ret.realBalance.toString();
    return ret;
  },
});

CashRegisterSchema.index({ openedByUserId: 1, status: 1 });
CashRegisterSchema.index({ openedAt: -1 });

export default mongoose.model<ICashRegister>('CashRegister', CashRegisterSchema);
