import { Request, Response, NextFunction } from 'express';

class ApiError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors?: any) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message: string = 'No autorizado') {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = 'Acceso prohibido') {
    return new ApiError(message, 403);
  }

  static notFound(message: string = 'Recurso no encontrado') {
    return new ApiError(message, 404);
  }

  static internal(message: string = 'Error interno del servidor') {
    return new ApiError(message, 500);
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

  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default ApiError;