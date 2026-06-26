import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType = 'INGRESO' | 'EGRESO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export interface ITransaction extends Document {
  cashRegisterId?: mongoose.Types.ObjectId;
  debtId?: mongoose.Types.ObjectId;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: mongoose.Types.Decimal128;
  voucherUrl?: string;
  registeredByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    cashRegisterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashRegister',
    },
    debtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Debt',
    },
    type: {
      type: String,
      enum: ['INGRESO', 'EGRESO'],
      required: [true, 'El tipo de transacción es requerido'],
    },
    paymentMethod: {
      type: String,
      enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'],
      required: [true, 'El método de pago es requerido'],
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'El monto es requerido'],
    },
    voucherUrl: {
      type: String,
      trim: true,
    },
    registeredByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario registrador es requerido'],
    },
  },
  { timestamps: true }
);

TransactionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.amount) ret.amount = ret.amount.toString();
    return ret;
  },
});

TransactionSchema.index({ cashRegisterId: 1 });
TransactionSchema.index({ debtId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
