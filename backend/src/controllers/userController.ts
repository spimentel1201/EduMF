import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Staff from '../models/Staff';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todos los usuarios
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const role = req.query.role as string;
    const searchTerm = req.query.search as string;

    // Construir query
    let query: any = {};
    
    // Filtrar por rol si se proporciona
    if (role) {
      query.role = role;
    }
    
    // Buscar por nombre, email o DNI
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { dni: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Ejecutar query con paginación
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un usuario por ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
    }

    // Verificar si el usuario tiene un perfil de staff asociado
    let staffProfile = null;
    if (user.role === 'admin' || user.role === 'teacher') {
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
 * @desc    Crear un nuevo usuario
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, email, password, role, dni, status } = req.body;

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
      status: status || 'active',
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dni: user.dni,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar un usuario
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, email, role, dni, status } = req.body;

    // Verificar si el usuario existe
    let user = await User.findById(req.params.id);
    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
    }

    // Verificar si el email o DNI ya está en uso por otro usuario
    if (email !== user.email || dni !== user.dni) {
      const existingUser = await User.findOne({
        $or: [
          { email, _id: { $ne: req.params.id } },
          { dni, _id: { $ne: req.params.id } },
        ],
      });

      if (existingUser) {
        return next(ApiError.badRequest('El email o DNI ya está en uso'));
      }
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, dni, status },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar un usuario
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar si el usuario existe
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
    }

    // Eliminar perfil de staff asociado si existe
    if (user.role === 'admin' || user.role === 'teacher') {
      await Staff.findOneAndDelete({ userId: user._id });
    }

    // Eliminar usuario
    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cambiar contraseña de un usuario
 * @route   PUT /api/users/:id/change-password
 * @access  Private/Admin
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { newPassword } = req.body;

    // Verificar si el usuario existe
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(ApiError.notFound('Usuario no encontrado'));
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