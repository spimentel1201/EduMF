import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/** Datos del apoderado que viajan en el reporte SIAGIE. */
export interface IApoderado {
  nombres?: string;
  parentesco?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  correo?: string;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  dni: string;
  /** Código de estudiante del SIAGIE (cuando el alumno no tiene DNI). */
  codigoEstudiante?: string;
  /** Documento usado como identidad: DNI de 8 dígitos o código SIAGIE. */
  tipoDocumento?: 'DNI' | 'CODIGO';
  apoderado?: IApoderado;
  gender?: 'M' | 'F' | 'O';
  birthdate?: Date;
  email?: string;
  password?: string;
  role: 'admin' | 'teacher' | 'student' | 'Dirección' | 'CIST' | 'Psicólogo(a)' | 'Docente' | 'Auxiliar' | 'Mantenimiento';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

const UserSchema: Schema = new Schema(
  {
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
    dni: {
      type: String,
      required: [true, 'El DNI es requerido'],
      unique: true,
      trim: true
    },
    codigoEstudiante: {
      type: String,
      trim: true,
    },
    tipoDocumento: {
      type: String,
      enum: ['DNI', 'CODIGO'],
      default: 'DNI',
    },
    apoderado: {
      nombres: { type: String, trim: true },
      parentesco: { type: String, trim: true },
      tipoDocumento: { type: String, trim: true },
      numeroDocumento: { type: String, trim: true },
      telefono: { type: String, trim: true },
      correo: { type: String, trim: true },
    },
    gender: {
      type: String,
      enum: ['M', 'F', 'O'],
      required: false,
    },
    birthdate: {
      type: Date,
      required: false,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
      required: false,
    },
    password: {
      type: String,
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false,
      required: false,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'Dirección', 'CIST', 'Psicólogo(a)', 'Docente', 'Auxiliar', 'Mantenimiento'],
      default: 'student',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Un código de estudiante SIAGIE no debe repetirse entre alumnos
UserSchema.index({ codigoEstudiante: 1 }, { unique: true, sparse: true });

UserSchema.pre<IUser>('save', async function (next) {
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

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function (): string {
  const jwtSecret = process.env.JWT_SECRET || 'defaultsecret';
  
  return jwt.sign(
    { id: this._id, role: this.role },
    jwtSecret,
    {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string
    } as jwt.SignOptions
  );
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;