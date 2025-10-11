import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import User from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware para proteger rutas que requieren autenticación
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    // Verificar si el token está en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar si el token existe
    if (!token) {
      return next(ApiError.unauthorized('No hay token, autorización denegada'));
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    // Obtener el usuario del token
    const user = await User.findById((decoded as any).id).select('-password');

    if (!user) {
      return next(ApiError.unauthorized('Usuario no encontrado'));
    }

    // Agregar el usuario a la solicitud
    req.user = user;
    next();
  } catch (error) {
    return next(ApiError.unauthorized('Token inválido'));
  }
};

/**
 * Middleware para restringir el acceso según el rol
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Usuario no autenticado'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('No tiene permiso para realizar esta acción'));
    }

    next();
  };
};