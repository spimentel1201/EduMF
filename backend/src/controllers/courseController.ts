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

    let query: any = {};
    
    if (level) {
      query.level = level;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

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

    const courseExists = await Course.findOne({ name });
    if (courseExists) {
      return next(ApiError.badRequest('Ya existe un curso con este nombre'));
    }

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

    if (name !== course.name) {
      const existingCourse = await Course.findOne({
        name,
        _id: { $ne: req.params.id },
      });

      if (existingCourse) {
        return next(ApiError.badRequest('El nombre ya está en uso por otro curso'));
      }
    }

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
    const course = await Course.findById(req.params.id);
    if (!course) {
      return next(ApiError.notFound('Curso no encontrado'));
    }

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

    if (!['Inicial', 'Primaria', 'Secundaria', 'Todos'].includes(level)) {
      return next(ApiError.badRequest('Nivel inválido'));
    }

    let query: any = { status };
    
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