import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Staff from '../models/Staff';
import User from '../models/User';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todos los miembros del personal
 * @route   GET /api/staff
 * @access  Private/Admin
 */
export const getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const role = req.query.role as string;
    const level = req.query.level as string;
    const searchTerm = req.query.search as string;
    const status = req.query.status as string;

    // Construir query
    let query: any = {};
    
    // Filtrar por rol si se proporciona
    if (role) {
      query.role = role;
    }
    
    // Filtrar por nivel si se proporciona
    if (level) {
      query.level = level;
    }
    
    // Filtrar por estado si se proporciona
    if (status) {
      query.status = status;
    }
    
    // Buscar por nombre, email o DNI
    if (searchTerm) {
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { dni: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Ejecutar query con paginación
    const total = await Staff.countDocuments(query);
    const staff = await Staff.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: staff.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un miembro del personal por ID
 * @route   GET /api/staff/:id
 * @access  Private/Admin
 */
export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('userId', 'name email role');

    if (!staff) {
      return next(ApiError.notFound('Miembro del personal no encontrado'));
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear un nuevo miembro del personal
 * @route   POST /api/staff
 * @access  Private/Admin
 */
export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const {
      dni,
      firstName,
      lastName,
      email,
      role,
      level,
      phone,
      address,
      userId,
    } = req.body;

    // Verificar si ya existe un miembro del personal con el mismo DNI
    const staffExists = await Staff.findOne({ dni });
    if (staffExists) {
      return next(ApiError.badRequest('Ya existe un miembro del personal con este DNI'));
    }

    // Verificar si el usuario existe si se proporciona userId
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return next(ApiError.badRequest('El usuario asociado no existe'));
      }
    }

    // Crear nuevo miembro del personal
    const staff = await Staff.create({
      dni,
      firstName,
      lastName,
      email,
      role,
      level,
      status: 'Activo',
      phone,
      address,
      userId,
    });

    res.status(201).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar un miembro del personal
 * @route   PUT /api/staff/:id
 * @access  Private/Admin
 */
export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const {
      dni,
      firstName,
      lastName,
      email,
      role,
      level,
      status,
      phone,
      address,
      userId,
    } = req.body;

    // Verificar si el miembro del personal existe
    let staff = await Staff.findById(req.params.id);
    if (!staff) {
      return next(ApiError.notFound('Miembro del personal no encontrado'));
    }

    // Verificar si el DNI ya está en uso por otro miembro del personal
    if (dni !== staff.dni) {
      const existingStaff = await Staff.findOne({
        dni,
        _id: { $ne: req.params.id },
      });

      if (existingStaff) {
        return next(ApiError.badRequest('El DNI ya está en uso por otro miembro del personal'));
      }
    }

    // Verificar si el usuario existe si se proporciona userId
    if (userId && userId !== staff.userId?.toString()) {
      const user = await User.findById(userId);
      if (!user) {
        return next(ApiError.badRequest('El usuario asociado no existe'));
      }
    }

    // Actualizar miembro del personal
    staff = await Staff.findByIdAndUpdate(
      req.params.id,
      {
        dni,
        firstName,
        lastName,
        email,
        role,
        level,
        status,
        phone,
        address,
        userId,
      },
      { new: true, runValidators: true }
    ).populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar un miembro del personal
 * @route   DELETE /api/staff/:id
 * @access  Private/Admin
 */
export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar si el miembro del personal existe
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return next(ApiError.notFound('Miembro del personal no encontrado'));
    }

    // Eliminar miembro del personal
    await staff.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Miembro del personal eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
};