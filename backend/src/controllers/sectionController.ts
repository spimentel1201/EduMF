import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Section from '../models/Section';
import SchoolYear from '../models/SchoolYear';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todas las secciones
 * @route   GET /api/sections
 * @access  Private
 */
export const getSections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const grade = req.query.grade as string;
    const level = req.query.level as string;
    const schoolYearId = req.query.schoolYearId as string;
    const status = req.query.status as string;
    const searchTerm = req.query.search as string;

    // Construir query
    let query: any = {};
    
    // Filtrar por grado si se proporciona
    if (grade) {
      query.grade = grade;
    }
    
    // Filtrar por nivel si se proporciona
    if (level) {
      query.level = level;
    }
    
    // Filtrar por año escolar si se proporciona
    if (schoolYearId) {
      query.schoolYearId = schoolYearId;
    }
    
    // Filtrar por estado si se proporciona
    if (status) {
      query.status = status;
    }
    
    // Buscar por nombre
    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: 'i' };
    }

    // Ejecutar query con paginación
    const total = await Section.countDocuments(query);
    const sections = await Section.find(query)
      .populate('schoolYearId', 'name startDate endDate')
      .sort({ grade: 1, name: 1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: sections.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener una sección por ID
 * @route   GET /api/sections/:id
 * @access  Private
 */
export const getSectionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = await Section.findById(req.params.id).populate('schoolYearId', 'name startDate endDate');

    if (!section) {
      return next(ApiError.notFound('Sección no encontrada'));
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear una nueva sección
 * @route   POST /api/sections
 * @access  Private/Admin
 */
export const createSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, grade, level, section, maxStudents, schoolYearId, status } = req.body;
    
    const schoolYear = await SchoolYear.findById(schoolYearId);
    if (!schoolYear) {
      return next(ApiError.badRequest('El año escolar no existe'));
    }
    
    const sectionExists = await Section.findOne({ 
      name, 
      grade,
      level,
      section: section.toUpperCase(),
      schoolYearId 
    });
    if (sectionExists) {
      return next(ApiError.badRequest('Ya existe una sección con estos datos en el año escolar seleccionado'));
    }
    
    // Crear nueva sección
    const sectionNew = await Section.create({
      name,
      grade,
      level,
      section: section.toUpperCase(),
      maxStudents,
      schoolYearId,
      status: status || 'Activo',
    });

    res.status(201).json({
      success: true,
      data: sectionNew,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar una sección
 * @route   PUT /api/sections/:id
 * @access  Private/Admin
 */
export const updateSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { name, grade, level, schoolYearId, status } = req.body;

    // Verificar si la sección existe
    let section = await Section.findById(req.params.id);
    if (!section) {
      return next(ApiError.notFound('Sección no encontrada'));
    }

    // Verificar si el año escolar existe
    if (schoolYearId) {
      const schoolYear = await SchoolYear.findById(schoolYearId);
      if (!schoolYear) {
        return next(ApiError.badRequest('El año escolar no existe'));
      }
    }

    // Verificar si el nombre ya está en uso por otra sección en el mismo año escolar
    if (name !== section.name || schoolYearId !== section.schoolYearId.toString()) {
      const existingSection = await Section.findOne({
        name,
        schoolYearId: schoolYearId || section.schoolYearId,
        _id: { $ne: req.params.id },
      });

      if (existingSection) {
        return next(ApiError.badRequest('El nombre ya está en uso por otra sección en el año escolar seleccionado'));
      }
    }

    section = await Section.findByIdAndUpdate(
      req.params.id,
      { name, grade, level, schoolYearId, status },
      { new: true, runValidators: true }
    ).populate('schoolYearId', 'name startDate endDate');

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar una sección
 * @route   DELETE /api/sections/:id
 * @access  Private/Admin
 */
export const deleteSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) {
      return next(ApiError.notFound('Sección no encontrada'));
    }

    await section.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Sección eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener secciones por año escolar
 * @route   GET /api/sections/school-year/:schoolYearId
 * @access  Private
 */
export const getSectionsBySchoolYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolYearId = req.params.schoolYearId;
    const level = req.query.level as string;
    const grade = req.query.grade as string;
    const status = req.query.status as string || 'active';

    // Verificar si el año escolar existe
    const schoolYear = await SchoolYear.findById(schoolYearId);
    if (!schoolYear) {
      return next(ApiError.notFound('Año escolar no encontrado'));
    }

    // Construir query
    let query: any = { schoolYearId, status };
    
    // Filtrar por nivel si se proporciona
    if (level) {
      query.level = level;
    }
    
    // Filtrar por grado si se proporciona
    if (grade) {
      query.grade = grade;
    }

    // Obtener secciones
    const sections = await Section.find(query).sort({ grade: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};