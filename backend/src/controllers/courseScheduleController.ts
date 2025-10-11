import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import CourseSchedule from '../models/CourseSchedule';
import Course from '../models/Course';
import Section from '../models/Section';
import Staff from '../models/Staff';
import TimeSlot from '../models/TimeSlot';
import SchoolYear from '../models/SchoolYear';
import ApiError from '../middleware/ApiError';

export const validateCourseSchedule = [
  body('courseId').notEmpty().withMessage('El curso es requerido'),
  body('sectionId').notEmpty().withMessage('La sección es requerida'),
  body('teacherId').notEmpty().withMessage('El docente es requerido'),
  body('dayOfWeek').notEmpty().withMessage('El día de la semana es requerido')
    .isIn(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])
    .withMessage('Día de la semana inválido'),
  body('timeSlotId').notEmpty().withMessage('El horario es requerido'),
  body('schoolYearId').notEmpty().withMessage('El año escolar es requerido'),
  body('status').optional().isIn(['Activo', 'Inactivo']).withMessage('Estado inválido')
];

// @desc    Obtener todos los horarios de curso
// @route   GET /api/course-schedules
// @access  Private
export const getCourseSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtros
    const filter: any = {};
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }
    if (req.query.sectionId) {
      filter.sectionId = req.query.sectionId;
    }
    if (req.query.teacherId) {
      filter.teacherId = req.query.teacherId;
    }
    if (req.query.dayOfWeek) {
      filter.dayOfWeek = req.query.dayOfWeek;
    }
    if (req.query.timeSlotId) {
      filter.timeSlotId = req.query.timeSlotId;
    }
    if (req.query.schoolYearId) {
      filter.schoolYearId = req.query.schoolYearId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const courseSchedules = await CourseSchedule.find(filter)
      .populate(['courseId', 'sectionId', 'teacherId', 'timeSlotId', 'schoolYearId'])
      .sort({ dayOfWeek: 1, 'timeSlotId.startTime': 1 })
      .skip(skip)
      .limit(limit);

    const total = await CourseSchedule.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: courseSchedules.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: courseSchedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener horarios por sección
// @route   GET /api/course-schedules/section/:sectionId
// @access  Private
export const getCourseSchedulesBySection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseSchedules = await CourseSchedule.find({
      sectionId: req.params.sectionId,
      status: 'Activo'
    })
      .populate(['courseId', 'sectionId', 'teacherId', 'timeSlotId', 'schoolYearId'])
      .sort({ dayOfWeek: 1, 'timeSlotId.startTime': 1 });

    res.status(200).json({
      success: true,
      count: courseSchedules.length,
      data: courseSchedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener horarios por docente
// @route   GET /api/course-schedules/teacher/:teacherId
// @access  Private
export const getCourseSchedulesByTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseSchedules = await CourseSchedule.find({
      teacherId: req.params.teacherId,
      status: 'Activo'
    })
      .populate(['courseId', 'sectionId', 'teacherId', 'timeSlotId', 'schoolYearId'])
      .sort({ dayOfWeek: 1, 'timeSlotId.startTime': 1 });

    res.status(200).json({
      success: true,
      count: courseSchedules.length,
      data: courseSchedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un horario de curso por ID
// @route   GET /api/course-schedules/:id
// @access  Private
export const getCourseScheduleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseSchedule = await CourseSchedule.findById(req.params.id)
      .populate(['courseId', 'sectionId', 'teacherId', 'timeSlotId', 'schoolYearId']);

    if (!courseSchedule) {
      return next(new ApiError('Horario de curso no encontrado', 404));
    }

    res.status(200).json({
      success: true,
      data: courseSchedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear un nuevo horario de curso
// @route   POST /api/course-schedules
// @access  Private (Admin)
export const createCourseSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el curso existe
    const course = await Course.findById(req.body.courseId);
    if (!course) {
      return next(new ApiError('Curso no encontrado', 404));
    }

    // Verificar que la sección existe
    const section = await Section.findById(req.body.sectionId);
    if (!section) {
      return next(new ApiError('Sección no encontrada', 404));
    }

    // Verificar que el docente existe
    const teacher = await Staff.findById(req.body.teacherId);
    if (!teacher) {
      return next(new ApiError('Docente no encontrado', 404));
    }

    // Verificar que el horario existe
    const timeSlot = await TimeSlot.findById(req.body.timeSlotId);
    if (!timeSlot) {
      return next(new ApiError('Horario no encontrado', 404));
    }

    // Verificar que el año escolar existe
    const schoolYear = await SchoolYear.findById(req.body.schoolYearId);
    if (!schoolYear) {
      return next(new ApiError('Año escolar no encontrado', 404));
    }

    // Verificar si ya existe un horario para esta sección, día y hora
    const existingSchedule = await CourseSchedule.findOne({
      sectionId: req.body.sectionId,
      dayOfWeek: req.body.dayOfWeek,
      timeSlotId: req.body.timeSlotId,
      schoolYearId: req.body.schoolYearId,
      status: 'Activo'
    });

    if (existingSchedule) {
      return next(new ApiError('Ya existe un horario para esta sección en este día y hora', 400));
    }

    // Verificar si el docente ya tiene un horario asignado en este día y hora
    const existingTeacherSchedule = await CourseSchedule.findOne({
      teacherId: req.body.teacherId,
      dayOfWeek: req.body.dayOfWeek,
      timeSlotId: req.body.timeSlotId,
      schoolYearId: req.body.schoolYearId,
      status: 'Activo'
    });

    if (existingTeacherSchedule) {
      return next(new ApiError('El docente ya tiene un horario asignado en este día y hora', 400));
    }

    const courseSchedule = await CourseSchedule.create(req.body);

    res.status(201).json({
      success: true,
      data: courseSchedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar un horario de curso
// @route   PUT /api/course-schedules/:id
// @access  Private (Admin)
export const updateCourseSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let courseSchedule = await CourseSchedule.findById(req.params.id);

    if (!courseSchedule) {
      return next(new ApiError('Horario de curso no encontrado', 404));
    }

    // Verificar que el curso existe si se está actualizando
    if (req.body.courseId) {
      const course = await Course.findById(req.body.courseId);
      if (!course) {
        return next(new ApiError('Curso no encontrado', 404));
      }
    }

    // Verificar que la sección existe si se está actualizando
    if (req.body.sectionId) {
      const section = await Section.findById(req.body.sectionId);
      if (!section) {
        return next(new ApiError('Sección no encontrada', 404));
      }
    }

    // Verificar que el docente existe si se está actualizando
    if (req.body.teacherId) {
      const teacher = await Staff.findById(req.body.teacherId);
      if (!teacher) {
        return next(new ApiError('Docente no encontrado', 404));
      }
    }

    // Verificar que el horario existe si se está actualizando
    if (req.body.timeSlotId) {
      const timeSlot = await TimeSlot.findById(req.body.timeSlotId);
      if (!timeSlot) {
        return next(new ApiError('Horario no encontrado', 404));
      }
    }

    // Verificar que el año escolar existe si se está actualizando
    if (req.body.schoolYearId) {
      const schoolYear = await SchoolYear.findById(req.body.schoolYearId);
      if (!schoolYear) {
        return next(new ApiError('Año escolar no encontrado', 404));
      }
    }

    // Verificar si ya existe un horario para esta sección, día y hora (excluyendo el actual)
    if (req.body.sectionId || req.body.dayOfWeek || req.body.timeSlotId || req.body.schoolYearId) {
      const sectionId = req.body.sectionId || courseSchedule.sectionId;
      const dayOfWeek = req.body.dayOfWeek || courseSchedule.dayOfWeek;
      const timeSlotId = req.body.timeSlotId || courseSchedule.timeSlotId;
      const schoolYearId = req.body.schoolYearId || courseSchedule.schoolYearId;

      const existingSchedule = await CourseSchedule.findOne({
        _id: { $ne: req.params.id },
        sectionId,
        dayOfWeek,
        timeSlotId,
        schoolYearId,
        status: 'Activo'
      });

      if (existingSchedule) {
        return next(new ApiError('Ya existe un horario para esta sección en este día y hora', 400));
      }

      // Verificar si el docente ya tiene un horario asignado en este día y hora (excluyendo el actual)
      const teacherId = req.body.teacherId || courseSchedule.teacherId;
      const existingTeacherSchedule = await CourseSchedule.findOne({
        _id: { $ne: req.params.id },
        teacherId,
        dayOfWeek,
        timeSlotId,
        schoolYearId,
        status: 'Activo'
      });

      if (existingTeacherSchedule) {
        return next(new ApiError('El docente ya tiene un horario asignado en este día y hora', 400));
      }
    }

    courseSchedule = await CourseSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: courseSchedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar un horario de curso
// @route   DELETE /api/course-schedules/:id
// @access  Private (Admin)
export const deleteCourseSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseSchedule = await CourseSchedule.findById(req.params.id);

    if (!courseSchedule) {
      return next(new ApiError('Horario de curso no encontrado', 404));
    }

    await courseSchedule.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};