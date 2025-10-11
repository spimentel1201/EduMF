import { Request, Response, NextFunction } from 'express';

/**
 * Clase para errores personalizados de la API
 */
export class ApiError extends Error {
  statusCode: number;
  errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors?: any) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message: string = 'No autorizado') {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Acceso prohibido') {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static internal(message: string = 'Error interno del servidor') {
    return new ApiError(500, message);
  }
}

/**
 * Middleware para manejar errores en la API
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido',
      errors: err,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  if (err.name === 'MongoError' && (err as any).code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Entrada duplicada',
      errors: err,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};