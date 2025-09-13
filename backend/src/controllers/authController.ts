import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Staff from '../models/Staff';
import { ApiError } from '../middleware/errorHandler';
import QRCode from 'qrcode';

/**
 * @desc    Registrar un nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, email, password, role, dni } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ $or: [{ email }, { dni }] });
    if (userExists) {
      return next(ApiError.badRequest('El usuario ya existe'));
    }

    // Crear nuevo usuario
    const user = await User.create({
      name,
      email,
      password,
      role,
      dni,
      status: 'active',
    });

    // Generar token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dni: user.dni,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Iniciar sesión
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { dni, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ dni }).select('+password');
    if (!user) {
      return next(ApiError.unauthorized('Credenciales inválidas'));
    }

    // Verificar si la contraseña es correcta
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(ApiError.unauthorized('Credenciales inválidas'));
    }

    // Verificar si el usuario está activo
    if (user.status !== 'active') {
      return next(ApiError.unauthorized('Usuario inactivo'));
    }

    // Generar token
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dni: user.dni,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Iniciar sesión con QR
 * @route   POST /api/auth/login-qr
 * @access  Public
 */
export const loginWithQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { qrData } = req.body;

    // Decodificar datos del QR (asumiendo que contiene el DNI)
    const dni = qrData;

    // Verificar si el usuario existe
    const user = await User.findOne({ dni });
    if (!user) {
      return next(ApiError.unauthorized('Usuario no encontrado'));
    }

    // Verificar si el usuario está activo
    if (user.status !== 'active') {
      return next(ApiError.unauthorized('Usuario inactivo'));
    }

    // Generar token
    const token = user.generateAuthToken();

    // Reemplazar las respuestas en login y loginWithQR
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
    
    // Y similar para register y loginWithQR
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
    
    // En getMe:
    res.status(200).json({
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generar código QR para un usuario
 * @route   GET /api/auth/generate-qr/:userId
 * @access  Private
 */
export const generateQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    // Verificar si el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
    }

    // Generar QR con el DNI del usuario
    const qrData = user.dni;
    const qrCode = await QRCode.toDataURL(qrData);

    res.status(200).json({
      success: true,
      data: {
        qrCode,
        dni: user.dni,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener perfil del usuario actual
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);

    // Verificar si el usuario tiene un perfil de staff asociado
    let staffProfile = null;
    if (user && (user.role === 'admin' || user.role === 'teacher')) {
      staffProfile = await Staff.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        staffProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar contraseña
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { currentPassword, newPassword } = req.body;

    // Obtener usuario con contraseña
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(ApiError.badRequest('Contraseña actual incorrecta'));
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    next(error);
  }
};