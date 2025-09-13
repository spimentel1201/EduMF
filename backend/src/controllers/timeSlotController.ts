import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import TimeSlot from '../models/TimeSlot';
import ApiError from '../middleware/ApiError';

// Validación para time slots
export const validateTimeSlot = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('startTime').notEmpty().withMessage('La hora de inicio es requerida')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('endTime').notEmpty().withMessage('La hora de fin es requerida')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  //body('dayOfWeek').isInt({ min: 1, max: 7 }).withMessage('El día de la semana debe ser un número entre 1 y 7'),
  body('status').optional().isString()
];

// @desc    Obtener todos los time slots
// @route   GET /api/time-slots
// @access  Private
export const getTimeSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filtros
    const filter: any = {};
    if (req.query.dayOfWeek) {
      filter.dayOfWeek = parseInt(req.query.dayOfWeek as string);
    }
    if (req.query.status !== undefined) {
      filter.status = req.query.status === 'true';
    }

    // Búsqueda por nombre
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const timeSlots = await TimeSlot.find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .skip(skip)
      .limit(limit);

    const total = await TimeSlot.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: timeSlots
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un time slot por ID
// @route   GET /api/time-slots/:id
// @access  Private
export const getTimeSlotById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return next(new ApiError('Time slot no encontrado', 404));
    }

    res.status(200).json({
      success: true,
      data: timeSlot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear un nuevo time slot
// @route   POST /api/time-slots
// @access  Private (Admin)
export const createTimeSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar si ya existe un time slot con el mismo nombre
    const existingTimeSlot = await TimeSlot.findOne({ name: req.body.name });
    if (existingTimeSlot) {
      return next(new ApiError('Ya existe un time slot con este nombre', 400));
    }

    // Verificar que la hora de fin sea posterior a la hora de inicio
    const startTime = req.body.startTime;
    const endTime = req.body.endTime;
    if (startTime >= endTime) {
      return next(new ApiError('La hora de fin debe ser posterior a la hora de inicio', 400));
    }

    // Verificar si hay solapamiento con otros time slots del mismo día
    const overlappingTimeSlot = await TimeSlot.findOne({
      dayOfWeek: req.body.dayOfWeek,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (overlappingTimeSlot) {
      return next(new ApiError('El time slot se solapa con otro existente en el mismo día', 400));
    }

    const timeSlot = await TimeSlot.create(req.body);

    res.status(201).json({
      success: true,
      data: timeSlot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar un time slot
// @route   PUT /api/time-slots/:id
// @access  Private (Admin)
export const updateTimeSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return next(new ApiError('Time slot no encontrado', 404));
    }

    // Verificar que la hora de fin sea posterior a la hora de inicio
    const startTime = req.body.startTime || timeSlot.startTime;
    const endTime = req.body.endTime || timeSlot.endTime;
    if (startTime >= endTime) {
      return next(new ApiError('La hora de fin debe ser posterior a la hora de inicio', 400));
    }

    // Verificar si hay solapamiento con otros time slots del mismo día
    const dayOfWeek = req.body.dayOfWeek;
    const overlappingTimeSlot = await TimeSlot.findOne({
      _id: { $ne: req.params.id },
      dayOfWeek,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (overlappingTimeSlot) {
      return next(new ApiError('El time slot se solapa con otro existente en el mismo día', 400));
    }

    timeSlot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: timeSlot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar un time slot
// @route   DELETE /api/time-slots/:id
// @access  Private (Admin)
export const deleteTimeSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return next(new ApiError('Time slot no encontrado', 404));
    }

    // Verificar si el time slot está siendo utilizado en algún horario de curso
    const CourseSchedule = require('../models/CourseSchedule').default;
    const usedInSchedule = await CourseSchedule.findOne({ timeSlotId: req.params.id });
    if (usedInSchedule) {
      return next(new ApiError('No se puede eliminar el time slot porque está siendo utilizado en un horario de curso', 400));
    }

    await timeSlot.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener time slots por día de la semana
// @route   GET /api/time-slots/day/:dayOfWeek
// @access  Private
export const getTimeSlotsByDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    
    if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
      return next(new ApiError('El día de la semana debe ser un número entre 1 y 7', 400));
    }

    const timeSlots = await TimeSlot.find({ 
      dayOfWeek,
      status: true 
    }).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots
    });
  } catch (error) {
    next(error);
  }
};