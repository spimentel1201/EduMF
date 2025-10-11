import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import Enrollment from '../models/Enrollment'; // Importar el modelo Enrollment
import ApiError from '../middleware/ApiError';
import mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import Staff from '../models/Staff';
import Schedule from '../models/CourseSchedule'; // Assuming CourseSchedule is the Schedule model

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
    const { startDate, endDate, sectionId, studentId } = req.query;

    const filter: any = {};
    if (startDate && endDate) {
      filter.date = { $gte: startOfDay(new Date(startDate as string)), $lte: endOfDay(new Date(endDate as string)) };
    }
    if (sectionId) {
      filter.sectionId = sectionId;
    }
    if (studentId) {
      filter['details.studentId'] = studentId;
    }



      const attendances = await Attendance.find(filter)
        .populate([
          { path: 'sectionId', select: 'name' },
          { path: 'teacherId', select: 'firstName lastName' },
          { path: 'details.studentId', select: 'firstName lastName' }
        ])
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

      // Calculate total formatted records count using aggregation
      const totalFormattedRecordsPipeline: any[] = [
        { $match: filter },
        { $unwind: '$details' },
        { $count: 'total' }
      ];

      const totalFormattedRecordsResult = await Attendance.aggregate(totalFormattedRecordsPipeline);
      const total = totalFormattedRecordsResult.length > 0 ? totalFormattedRecordsResult[0].total : 0;

      const formattedRecords = attendances.flatMap(attendance => {
        const sectionName = (attendance.sectionId as any)?.name || 'N/A';
        const teacherName = (attendance.teacherId as any)?.firstName + ' ' + (attendance.teacherId as any)?.lastName || 'N/A';

        return attendance.details.map(detail => ({
          id: attendance._id,
          date: attendance.date.toISOString(),
          sectionId: attendance.sectionId,
          sectionName: sectionName,
          studentId: detail.studentId,
          studentName: (detail.studentId as any)?.firstName + ' ' + (detail.studentId as any)?.lastName || 'N/A',
          status: detail.status,
          notes: detail.notes,
          teacherId: attendance.teacherId,
          teacherName: teacherName,
        }));
      });
    res.status(200).json({
        success: true,
        count: formattedRecords.length,
        total: total,
        pagination: {
          page: page,
          limit: limit,
          totalPages: Math.ceil(total / limit),
        },
        data: formattedRecords,
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

    const { id } = req.params;
    const { status, studentId, sectionId, date } = req.body;
    const userId = (req as any).user.id; // Assuming user ID is available from authentication middleware
    const userRole = (req as any).user.role; // Assuming user role is available from authentication middleware

    let attendance = await Attendance.findById(id);

    if (!attendance) {
      return next(new ApiError('Attendance record not found', 404));
    }

    // Admin can update any attendance record
    if (userRole === 'admin') {
      attendance.status = status || attendance.status;
      await attendance.save();
      return res.status(200).json({
        success: true,
        data: attendance
      });
    }

    // Teachers can only update attendance for the current day and their own classes
    if (userRole === 'teacher') {
      const today = new Date();
      const attendanceDate = new Date(attendance.date);

      if (attendanceDate < startOfDay(today) || attendanceDate > endOfDay(today)) {
        return next(new ApiError('Teachers can only modify attendance for the current day', 403));
      }

      // Verify if the teacher is assigned to the section of the attendance record
      const teacher = await Staff.findOne({ userId: userId });
      if (!teacher) {
        return next(new ApiError('Teacher not found', 404));
      }

      const schedule = await Schedule.findOne({
        teacher: teacher._id,
        section: attendance.sectionId,
        day: attendanceDate.getDay().toString(), // Assuming day is stored as a string (0-6 for Sunday-Saturday)
      });

      if (!schedule) {
        return next(new ApiError('Teacher is not authorized to modify attendance for this section', 403));
      }

      attendance.status = status || attendance.status;
      await attendance.save();
      return res.status(200).json({
        success: true,
        data: attendance
      });
    }

    return next(new ApiError('Unauthorized to update attendance', 403));

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

// @desc    Obtener reporte mensual de asistencias
// @route   GET /api/attendances/report/monthly
// @access  Private
export const getMonthlyAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId, month, year } = req.query;

    if (!month || !year) {
      return next(new ApiError('Mes y año son requeridos para el reporte mensual', 400));
    }

    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const match: any = {
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    };

    if (sectionId) {
      match.sectionId = new mongoose.Types.ObjectId(sectionId as string);
    }
    const report = await Attendance.aggregate([
      { $match: match },
      { $unwind: '$details' },
      // Obtener datos del estudiante
      { $lookup: {
          from: 'users',
          localField: 'details.studentId',
          foreignField: '_id',
          as: 'studentInfo'
      }},

      { $unwind: '$studentInfo' },
      // Agrupar por fecha, estudiante y estado de asistencia
      { $group: {
          _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              studentId: '$details.studentId',
              studentName: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
              status: '$details.status'
          },
          count: { $sum: 1 }
      }},
      // Re-agrupar para consolidar por fecha y calcular totales
      { $group: {
          _id: '$_id.date',
          students: {
              $push: {
                  studentId: '$_id.studentId',
                  studentName: '$_id.studentName',
                  status: '$_id.status',
                  count: '$count'
              }
          },
          present: {
              $sum: {
                  $cond: [ { $eq: ['$_id.status', 'Presente'] }, '$count', 0 ]
              }
          },
          absent: {
              $sum: {
                  $cond: [ { $eq: ['$_id.status', 'Ausente'] }, '$count', 0 ]
              }
          },
          late: {
              $sum: {
                  $cond: [ { $eq: ['$_id.status', 'Tardanza'] }, '$count', 0 ]
              }
          },
          justified: {
              $sum: {
                  $cond: [ { $eq: ['$_id.status', 'Justificado'] }, '$count', 0 ]
              }
          }
      }},
      { $sort: { _id: 1 } }
    ]);
        console.log('Monthly Attendance Report - Aggregation Result:', report); 
        res.status(200).json({
          success: true,
          data: report,
        });
      } catch (error) {
        next(error);
      }
};