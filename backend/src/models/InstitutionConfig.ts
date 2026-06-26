import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionConfig extends Document {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
  bgImageBase64: string;
  bgOpacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const InstitutionConfigSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la institución es requerido'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^\S+@\S+\.\S+$/, 'El correo electrónico no tiene un formato válido'],
    },
    logoBase64: {
      type: String,
      default: '',
    },
    bgImageBase64: {
      type: String,
      default: '',
    },
    bgOpacity: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

InstitutionConfigSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const InstitutionConfig = mongoose.model<IInstitutionConfig>(
  'InstitutionConfig',
  InstitutionConfigSchema
);

export default InstitutionConfig;
