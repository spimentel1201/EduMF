import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export type GuardianSource = 'import' | 'manual' | 'phone';
export type GuardianStatus = 'active' | 'inactive';
export type GuardianDocumentType = 'DNI' | 'CE' | 'PAS' | 'OTRO';

/**
 * Tutor / apoderado del portal de padres.
 *
 * Vive en una colección separada de `User` para no mezclar la identidad del
 * staff y del alumno con la del padre. El `loginId` es el documento, código o
 * teléfono con el que entra; los `aliases` permiten entrar con los datos de
 * cualquiera de sus hijos.
 */
export interface IGuardian extends Document {
  loginId: string;
  aliases: string[];
  documento?: string;
  tipoDocumento?: GuardianDocumentType;
  nombres: string;
  telefono?: string;
  email?: string;
  password?: string;
  /** false = sigue usando la clave inicial (el loginId o un alias). */
  hasCustomPassword: boolean;
  /** Fecha de nacimiento del alumno validada en el primer ingreso. */
  identityVerifiedAt?: Date;
  students: mongoose.Types.ObjectId[];
  status: GuardianStatus;
  source: GuardianSource;
  lastLoginAt?: Date;
  passwordResetAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

const GuardianSchema: Schema = new Schema(
  {
    loginId: {
      type: String,
      required: [true, 'El identificador de acceso es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    documento: {
      type: String,
      trim: true,
    },
    tipoDocumento: {
      type: String,
      enum: ['DNI', 'CE', 'PAS', 'OTRO'],
    },
    nombres: {
      type: String,
      required: [true, 'El nombre del tutor es requerido'],
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'El correo electrónico no tiene un formato válido'],
    },
    password: {
      type: String,
      select: false,
    },
    hasCustomPassword: {
      type: Boolean,
      default: false,
    },
    identityVerifiedAt: {
      type: Date,
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    source: {
      type: String,
      enum: ['import', 'manual', 'phone'],
      default: 'manual',
    },
    lastLoginAt: {
      type: Date,
    },
    passwordResetAt: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

GuardianSchema.pre<IGuardian>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

GuardianSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

GuardianSchema.methods.generateAuthToken = function (): string {
  const jwtSecret = process.env.JWT_SECRET || 'defaultsecret';
  return jwt.sign(
    { id: this._id, role: 'guardian' },
    jwtSecret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string } as jwt.SignOptions
  );
};

// Un tutor puede tener varios alias (documentos/códigos/teléfonos de sus hijos).
GuardianSchema.index({ aliases: 1 });
GuardianSchema.index({ students: 1 });
GuardianSchema.index({ documento: 1 });
GuardianSchema.index({ status: 1 });

GuardianSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

const Guardian = mongoose.model<IGuardian>('Guardian', GuardianSchema);

export default Guardian;
