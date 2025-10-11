import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  level: string;
  status: string;
  phone: string;
  address: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema(
  {
    dni: {
      type: String,
      required: [true, 'El DNI es requerido'],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
    },
    role: {
      type: String,
      enum: ['Docente', 'Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Auxiliar'],
      required: [true, 'El rol es requerido'],
    },
    level: {
      type: String,
      enum: ['Inicial', 'Primaria', 'Secundaria', 'General'],
      required: [true, 'El nivel educativo es requerido'],
    },
    status: {
      type: String,
      enum: ['Activo', 'Inactivo'],
      default: 'Activo',
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es requerido'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'La dirección es requerida'],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

StaffSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

StaffSchema.index({ dni: 1 });
StaffSchema.index({ email: 1 });
StaffSchema.index({ role: 1 });
StaffSchema.index({ level: 1 });
StaffSchema.index({ status: 1 });

StaffSchema.virtual('fullName').get(function (this: IStaff) {
  return `${this.firstName} ${this.lastName}`;
});

const Staff = mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;