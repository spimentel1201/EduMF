import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import Enrollment from '../models/Enrollment'; // Importar el modelo Enrollment
import ApiError from '../middleware/ApiError';
import mongoose from 'mongoose';

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
    if (req.query.sectionId) {
      const courseSchedules = await CourseSchedule.find({ sectionId: req.query.sectionId });
      const courseScheduleIds = courseSchedules.map(cs => cs._id);
      filter.courseScheduleId = { $in: courseScheduleIds };
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

export const bulkCreateAttendances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, sectionId, studentAttendances } = req.body;

    if (!date || !sectionId || !studentAttendances || !Array.isArray(studentAttendances)) {
      return res.status(400).json({ message: 'Fecha, ID de sección y asistencias de estudiantes son requeridos.' });
    }

    const courseSchedules = await CourseSchedule.find({ sectionId });
    if (courseSchedules.length === 0) {
      return res.status(404).json({ message: 'No se encontraron horarios de curso para la sección proporcionada.' });
    }

    const takenBy = req.user.id; // El usuario que registra la asistencia

    const results = [];

    for (const studentAttendance of studentAttendances) {
      const { studentId, status } = studentAttendance;
      const studentObjectId = new mongoose.Types.ObjectId(studentId);
      const currentAttendanceDate = new Date(date); // Crear una nueva instancia de fecha para cada iteración

      const enrollment = await Enrollment.findOne({ studentId: studentObjectId, sectionId });

      if (!enrollment) {
        results.push({ studentId, status, success: false, message: 'Estudiante no matriculado en esta sección.' });
        continue;
      }

      const courseSchedule = courseSchedules.find(cs => cs.sectionId.toString() === enrollment.sectionId.toString());

      if (!courseSchedule) {
        results.push({ studentId, status, success: false, message: 'No se encontró horario de curso para la sección del estudiante.' });
        continue;
      }

      let attendanceRecord = await Attendance.findOne({
        courseScheduleId: courseSchedule._id,
        date: {
          $gte: new Date(new Date(currentAttendanceDate).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(currentAttendanceDate).setHours(23, 59, 59, 999))
        }
      });

      if (attendanceRecord) {
        // Actualizar el registro existente
        const detailIndex = attendanceRecord.details.findIndex(d => d.studentId.toString() === studentId);
        if (detailIndex > -1) {
          attendanceRecord.details[detailIndex].status = status;
        } else {
          attendanceRecord.details.push({ studentId: new mongoose.Types.ObjectId(studentId), status });
        }
        // No se actualiza takenBy aquí, ya que es para el registro general de asistencia, no por detalle de estudiante
        await attendanceRecord.save();
        results.push({ studentId, status, success: true, message: 'Asistencia actualizada.' });
      } else {
        // Crear un nuevo registro
        attendanceRecord = await Attendance.create({
          courseScheduleId: courseSchedule._id,
          sectionId: sectionId, // Añadir sectionId al registro de asistencia
          teacherId: takenBy, // El takenBy es el teacherId
          date: currentAttendanceDate,
          status: 'Tomada', // Establecer el estado general de la asistencia
          details: [{
            studentId: new mongoose.Types.ObjectId(studentId),
            status: status,
          }],
        });
        results.push({ studentId, status, success: true, message: 'Asistencia creada.' });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
    });

  } catch (error) {
    next(error);
  }
};