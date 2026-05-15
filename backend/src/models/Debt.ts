import mongoose, { Schema, Document } from 'mongoose';

export type DebtStatus = 'PENDIENTE' | 'EN_VALIDACION' | 'PAGADO' | 'VENCIDO' | 'ANULADO';

export interface IDebt extends Document {
  studentId: mongoose.Types.ObjectId;
  concept: string;
  amount: mongoose.Types.Decimal128;
  dueDate: Date;
  status: DebtStatus;
  voucherUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DebtSchema = new Schema<IDebt>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El estudiante es requerido'],
    },
    concept: {
      type: String,
      required: [true, 'El concepto es requerido'],
      trim: true,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'El monto es requerido'],
    },
    dueDate: {
      type: Date,
      required: [true, 'La fecha de vencimiento es requerida'],
    },
    status: {
      type: String,
      enum: ['PENDIENTE', 'EN_VALIDACION', 'PAGADO', 'VENCIDO', 'ANULADO'],
      default: 'PENDIENTE',
    },
    voucherUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

DebtSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (ret.amount) ret.amount = ret.amount.toString();
    return ret;
  },
});

DebtSchema.index({ studentId: 1 });
DebtSchema.index({ status: 1 });
DebtSchema.index({ concept: 'text' });
DebtSchema.index({ dueDate: 1 });

export default mongoose.model<IDebt>('Debt', DebtSchema);
