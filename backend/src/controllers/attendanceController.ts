import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import Enrollment from '../models/Enrollment';
import ApiError from '../middleware/ApiError';
import mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import Staff from '../models/Staff';
import Schedule from '../models/CourseSchedule';

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

    const courseSchedule = await CourseSchedule.findById(req.body.courseScheduleId);
    if (!courseSchedule) {
      return next(new ApiError('Horario del curso no encontrado', 404));
    }

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
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    let attendance = await Attendance.findById(id);

    if (!attendance) {
      return next(new ApiError('Attendance record not found', 404));
    }

    if (userRole === 'admin') {
      attendance.status = status || attendance.status;
      await attendance.save();
      return res.status(200).json({
        success: true,
        data: attendance
      });
    }
    if (userRole === 'teacher') {
      const today = new Date();
      const attendanceDate = new Date(attendance.date);

      if (attendanceDate < startOfDay(today) || attendanceDate > endOfDay(today)) {
        return next(new ApiError('Teachers can only modify attendance for the current day', 403));
      }

      const teacher = await Staff.findOne({ userId: userId });
      if (!teacher) {
        return next(new ApiError('Teacher not found', 404));
      }

      const schedule = await Schedule.findOne({
        teacher: teacher._id,
        section: attendance.sectionId,
        day: attendanceDate.getDay().toString(),
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

    const takenBy = req.user.id;
    const results = [];

    for (const studentAttendance of studentAttendances) {
      const { studentId, status } = studentAttendance;
      const studentObjectId = new mongoose.Types.ObjectId(studentId);
      const currentAttendanceDate = new Date(date);

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
        const detailIndex = attendanceRecord.details.findIndex(d => d.studentId.toString() === studentId);
        if (detailIndex > -1) {
          attendanceRecord.details[detailIndex].status = status;
        } else {
          attendanceRecord.details.push({ studentId: new mongoose.Types.ObjectId(studentId), status });
        }
        await attendanceRecord.save();
        results.push({ studentId, status, success: true, message: 'Asistencia actualizada.' });
      } else {
        // Crear un nuevo registro
        attendanceRecord = await Attendance.create({
          courseScheduleId: courseSchedule._id,
          sectionId: sectionId,
          teacherId: takenBy,
          date: currentAttendanceDate,
          status: 'Tomada',
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
      {
        $lookup: {
          from: 'users',
          localField: 'details.studentId',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },

      { $unwind: '$studentInfo' },
      // Agrupar por fecha, estudiante y estado de asistencia
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            studentId: '$details.studentId',
            studentName: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
            status: '$details.status'
          },
          count: { $sum: 1 }
        }
      },
      // Re-agrupar para consolidar por fecha y calcular totales
      {
        $group: {
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
              $cond: [{ $eq: ['$_id.status', 'Presente'] }, '$count', 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'Ausente'] }, '$count', 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'Tardanza'] }, '$count', 0]
            }
          },
          justified: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'Justificado'] }, '$count', 0]
            }
          }
        }
      },
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

// @desc    Obtener datos para heatmap de asistencia (por estudiante/día)
// @route   GET /api/attendances/report/heatmap
// @access  Private
export const getHeatmapData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId, month, year } = req.query;

    if (!sectionId || !month || !year) {
      return next(new ApiError('Sección, mes y año son requeridos', 400));
    }

    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0);
    endOfMonth.setHours(23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    // Obtener todos los estudiantes matriculados en la sección
    const enrollments = await Enrollment.find({ sectionId })
      .populate('studentId', 'firstName lastName dni');

    // Obtener todas las asistencias del mes para esta sección
    const attendances = await Attendance.find({
      sectionId: new mongoose.Types.ObjectId(sectionId as string),
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Crear mapa de asistencia por estudiante y día
    const attendanceMap: Record<string, Record<number, string>> = {};

    attendances.forEach(attendance => {
      const day = attendance.date.getDate();
      attendance.details.forEach((detail: any) => {
        const studentId = detail.studentId.toString();
        if (!attendanceMap[studentId]) {
          attendanceMap[studentId] = {};
        }
        attendanceMap[studentId][day] = detail.status;
      });
    });

    // Construir datos del heatmap
    const heatmapData = enrollments.map((enrollment: any) => {
      const student = enrollment.studentId;
      const studentId = student._id.toString();
      const studentName = `${student.firstName} ${student.lastName}`;

      // Generar array de días con estados
      const days: { day: number; status: string | null }[] = [];
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let justifiedCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(Number(year), Number(month) - 1, d);
        const dayOfWeek = date.getDay();

        // Marcar fines de semana como no lectivo
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          days.push({ day: d, status: 'weekend' });
        } else {
          const status = attendanceMap[studentId]?.[d] || null;
          days.push({ day: d, status });

          if (status === 'Presente') presentCount++;
          else if (status === 'Ausente') absentCount++;
          else if (status === 'Tardanza') lateCount++;
          else if (status === 'Justificado') justifiedCount++;
        }
      }

      const totalDays = presentCount + absentCount + lateCount + justifiedCount;
      const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

      return {
        studentId,
        studentName,
        dni: student.dni,
        days,
        summary: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          justified: justifiedCount,
          attendanceRate
        }
      };
    });

    // Calcular totales generales
    const totals = heatmapData.reduce((acc, student) => ({
      present: acc.present + student.summary.present,
      absent: acc.absent + student.summary.absent,
      late: acc.late + student.summary.late,
      justified: acc.justified + student.summary.justified,
    }), { present: 0, absent: 0, late: 0, justified: 0 });

    const totalRecords = totals.present + totals.absent + totals.late + totals.justified;
    const overallAttendanceRate = totalRecords > 0
      ? Math.round((totals.present / totalRecords) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        students: heatmapData,
        daysInMonth,
        summary: {
          ...totals,
          total: totalRecords,
          attendanceRate: overallAttendanceRate,
          studentCount: heatmapData.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener comparativo de asistencia entre secciones
// @route   GET /api/attendances/report/comparison
// @access  Private
export const getSectionsComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return next(new ApiError('Mes y año son requeridos', 400));
    }

    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const comparison = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      { $unwind: '$details' },
      {
        $lookup: {
          from: 'sections',
          localField: 'sectionId',
          foreignField: '_id',
          as: 'sectionInfo'
        }
      },
      { $unwind: '$sectionInfo' },
      {
        $group: {
          _id: '$sectionId',
          sectionName: { $first: '$sectionInfo.name' },
          present: {
            $sum: { $cond: [{ $eq: ['$details.status', 'Presente'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$details.status', 'Ausente'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$details.status', 'Tardanza'] }, 1, 0] }
          },
          justified: {
            $sum: { $cond: [{ $eq: ['$details.status', 'Justificado'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1]
          }
        }
      },
      { $sort: { attendanceRate: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener tendencia de asistencia semanal para dashboard
// @route   GET /api/attendances/weekly-trend
// @access  Private
export const getWeeklyTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calcular el lunes de esta semana
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];

    // Obtener datos para cada día de la semana actual (Lun-Vie)
    for (let i = 0; i < 5; i++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      const nextDay = new Date(currentDay);
      nextDay.setDate(currentDay.getDate() + 1);

      const dayStats = await Attendance.aggregate([
        {
          $match: {
            date: { $gte: currentDay, $lt: nextDay }
          }
        },
        { $unwind: '$details' },
        {
          $group: {
            _id: null,
            present: {
              $sum: { $cond: [{ $eq: ['$details.status', 'Presente'] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$details.status', 'Tardanza'] }, 1, 0] }
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$details.status', 'Ausente'] }, 1, 0] }
            },
            justified: {
              $sum: { $cond: [{ $eq: ['$details.status', 'Justificado'] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        }
      ]);

      const stats = dayStats[0] || { present: 0, late: 0, absent: 0, justified: 0, total: 0 };
      const total = stats.total || 1;

      result.push({
        day: weekDays[currentDay.getDay()],
        date: currentDay.toISOString().split('T')[0],
        asistencia: Math.round((stats.present / total) * 100) || 0,
        tardanza: Math.round((stats.late / total) * 100) || 0,
        ausencia: Math.round((stats.absent / total) * 100) || 0,
        raw: {
          present: stats.present,
          late: stats.late,
          absent: stats.absent,
          justified: stats.justified,
          total: stats.total
        }
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener actividad reciente para dashboard
// @route   GET /api/attendances/recent-activity
// @access  Private
export const getRecentActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener las últimas 5 asistencias registradas
    const recentAttendances = await Attendance.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sectionId', 'name')
      .populate('teacherId', 'firstName lastName');

    const activities = recentAttendances.map(att => ({
      type: 'attendance',
      title: 'Asistencia registrada',
      description: `${(att.sectionId as any)?.name || 'Sección'} - ${att.details.length} estudiantes`,
      time: att.createdAt,
      icon: 'CheckCircleIcon',
      color: 'bg-green-500'
    }));

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};