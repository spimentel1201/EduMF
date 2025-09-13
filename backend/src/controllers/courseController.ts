import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Course from '../models/Course';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todos los cursos
 * @route   GET /api/courses
 * @access  Private
 */
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const level = req.query.level as string;
    const status = req.query.status as string;
    const searchTerm = req.query.search as string;

    // Construir query
    let query: any = {};
    
    // Filtrar por nivel si se proporciona
    if (level) {
      query.level = level;
    }
    
    // Filtrar por estado si se proporciona
    if (status) {
      query.status = status;
    }
    
    // Buscar por nombre o descripción
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Ejecutar query con paginación
    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .sort({ name: 1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener un curso por ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
export const getCourseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return next(ApiError.notFound('Curso no encontrado'));
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear un nuevo curso
 * @route   POST /api/courses
 * @access  Private/Admin
 */
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, description, level } = req.body;

    // Verificar si ya existe un curso con el mismo nombre
    const courseExists = await Course.findOne({ name });
    if (courseExists) {
      return next(ApiError.badRequest('Ya existe un curso con este nombre'));
    }

    // Crear nuevo curso
    const course = await Course.create({
      name,
      description,
      level,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar un curso
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, description, level, status } = req.body;

    // Verificar si el curso existe
    let course = await Course.findById(req.params.id);
    if (!course) {
      return next(ApiError.notFound('Curso no encontrado'));
    }

    // Verificar si el nombre ya está en uso por otro curso
    if (name !== course.name) {
      const existingCourse = await Course.findOne({
        name,
        _id: { $ne: req.params.id },
      });

      if (existingCourse) {
        return next(ApiError.badRequest('El nombre ya está en uso por otro curso'));
      }
    }

    // Actualizar curso
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { name, description, level, status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar un curso
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar si el curso existe
    const course = await Course.findById(req.params.id);
    if (!course) {
      return next(ApiError.notFound('Curso no encontrado'));
    }

    // Eliminar curso
    await course.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Curso eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener cursos por nivel
 * @route   GET /api/courses/level/:level
 * @access  Private
 */
export const getCoursesByLevel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const level = req.params.level;
    const status = req.query.status as string || 'active';

    // Validar nivel
    if (!['Inicial', 'Primaria', 'Secundaria', 'Todos'].includes(level)) {
      return next(ApiError.badRequest('Nivel inválido'));
    }

    // Construir query
    let query: any = { status };
    
    // Si el nivel no es 'Todos', filtrar por nivel
    if (level !== 'Todos') {
      query.level = level;
    }

    // Obtener cursos
    const courses = await Course.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};