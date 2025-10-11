import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  dni: string;
  gender?: 'male' | 'female' | 'other';
  birthdate?: Date;
  email?: string;
  password?: string;
  role: 'admin' | 'teacher' | 'student';
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
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido'],
      required: [true, 'El email es requerido'],
    },
    password: {
      type: String,
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false,
      required: false,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
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