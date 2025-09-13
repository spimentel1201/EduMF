import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import ApiError from '../middleware/ApiError';

// Validación para asistencia
export const validateAttendance = [
  body('courseScheduleId').notEmpty().withMessage('El horario del curso es requerido'),
  body('date').notEmpty().withMessage('La fecha es requerida').isDate().withMessage('Formato de fecha inválido'),
  body('presentCount').isInt({ min: 0 }).withMessage('El conteo de presentes debe ser un número entero positivo'),
  body('absentCount').isInt({ min: 0 }).withMessage('El conteo de ausentes debe ser un número entero positivo'),
  body('status').optional().isIn(['Pendiente', 'Completado']).withMessage('Estado inválido')
];

// @desc    Obtener todas las asistencias
// @route   GET /api/attendance
// @access  Private
export const getAttendances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtros
    const filter: any = {};
    if (req.query.courseScheduleId) {
      filter.courseScheduleId = req.query.courseScheduleId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.date) {
      const date = new Date(req.query.date as string);
      filter.date = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      };
    }

    const attendances = await Attendance.find(filter)
      .populate([
        { path: 'courseScheduleId', populate: ['courseId', 'sectionId', 'teacherId', 'timeSlotId'] },
        { path: 'takenBy' }
      ])
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: attendances.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: attendances
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener una asistencia por ID
// @route   GET /api/attendance/:id
// @access  Private
export const getAttendanceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate([
        { path: 'courseScheduleId', populate: ['courseId', 'sectionId', 'teacherId', 'timeSlotId'] },
        { path: 'takenBy' }
      ]);

    if (!attendance) {
      return next(new ApiError('Asistencia no encontrada', 404));
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear una nueva asistencia
// @route   POST /api/attendance
// @access  Private
export const createAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el horario del curso existe
    const courseSchedule = await CourseSchedule.findById(req.body.courseScheduleId);
    if (!courseSchedule) {
      return next(new ApiError('Horario del curso no encontrado', 404));
    }

    // Verificar si ya existe una asistencia para este horario y fecha
    const date = new Date(req.body.date);
    const existingAttendance = await Attendance.findOne({
      courseScheduleId: req.body.courseScheduleId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });

    if (existingAttendance) {
      return next(new ApiError('Ya existe una asistencia para este horario y fecha', 400));
    }

    // Asignar el usuario que toma la asistencia
    req.body.takenBy = req.user.id;

    const attendance = await Attendance.create(req.body);

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar una asistencia
// @route   PUT /api/attendance/:id
// @access  Private
export const updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(new ApiError('Asistencia no encontrada', 404));
    }

    // Verificar que el horario del curso existe si se está actualizando
    if (req.body.courseScheduleId) {
      const courseSchedule = await CourseSchedule.findById(req.body.courseScheduleId);
      if (!courseSchedule) {
        return next(new ApiError('Horario del curso no encontrado', 404));
      }
    }

    attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar una asistencia
// @route   DELETE /api/attendance/:id
// @access  Private (Admin)
export const deleteAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(new ApiError('Asistencia no encontrada', 404));
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};