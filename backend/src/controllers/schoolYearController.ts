import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import SchoolYear from '../models/SchoolYear';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todos los años escolares
 * @route   GET /api/school-years
 * @access  Private
 */
export const getSchoolYears = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const status = req.query.status as string;
    const searchTerm = req.query.search as string;

    // Construir query
    let query: any = {};
    
    // Filtrar por estado si se proporciona
    if (status) {
      query.status = status;
    }
    
    // Buscar por nombre
    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: 'i' };
    }

    // Ejecutar query con paginación
    const total = await SchoolYear.countDocuments(query);
    const schoolYears = await SchoolYear.find(query)
      .sort({ startDate: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: schoolYears.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: schoolYears,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un año escolar por ID
 * @route   GET /api/school-years/:id
 * @access  Private
 */
export const getSchoolYearById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolYear = await SchoolYear.findById(req.params.id);

    if (!schoolYear) {
      return next(ApiError.notFound('Año escolar no encontrado'));
    }

    res.status(200).json({
      success: true,
      data: schoolYear,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear un nuevo año escolar
 * @route   POST /api/school-years
 * @access  Private/Admin
 */
export const createSchoolYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, startDate, endDate, status } = req.body;

    // Verificar si ya existe un año escolar con el mismo nombre
    const schoolYearExists = await SchoolYear.findOne({ name });
    if (schoolYearExists) {
      return next(ApiError.badRequest('Ya existe un año escolar con este nombre'));
    }

    // Crear nuevo año escolar
    const schoolYear = await SchoolYear.create({
      name,
      startDate,
      endDate,
      status
    });

    res.status(201).json({
      success: true,
      data: schoolYear,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar un año escolar
 * @route   PUT /api/school-years/:id
 * @access  Private/Admin
 */
export const updateSchoolYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, startDate, endDate, status } = req.body;

    // Verificar si el año escolar existe
    let schoolYear = await SchoolYear.findById(req.params.id);
    if (!schoolYear) {
      return next(ApiError.notFound('Año escolar no encontrado'));
    }

    // Verificar si el nombre ya está en uso por otro año escolar
    if (name !== schoolYear.name) {
      const existingSchoolYear = await SchoolYear.findOne({
        name,
        _id: { $ne: req.params.id },
      });

      if (existingSchoolYear) {
        return next(ApiError.badRequest('El nombre ya está en uso por otro año escolar'));
      }
    }

    // Actualizar año escolar
    schoolYear = await SchoolYear.findByIdAndUpdate(
      req.params.id,
      { name, startDate, endDate, status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: schoolYear,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar un año escolar
 * @route   DELETE /api/school-years/:id
 * @access  Private/Admin
 */
export const deleteSchoolYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar si el año escolar existe
    const schoolYear = await SchoolYear.findById(req.params.id);
    if (!schoolYear) {
      return next(ApiError.notFound('Año escolar no encontrado'));
    }

    // Eliminar año escolar
    await schoolYear.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Año escolar eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener el año escolar actual
 * @route   GET /api/school-years/current
 * @access  Private
 */
export const getCurrentSchoolYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentDate = new Date();
    
    // Buscar año escolar activo que incluya la fecha actual
    const schoolYear = await SchoolYear.findOne({
      status: 'active',
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    if (!schoolYear) {
      return next(ApiError.notFound('No se encontró un año escolar activo para la fecha actual'));
    }

    res.status(200).json({
      success: true,
      data: schoolYear,
    });
  } catch (error) {
    next(error);
  }
};