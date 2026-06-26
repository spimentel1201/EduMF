import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import SchoolYear from '../models/SchoolYear';
import ApiError from '../middleware/ApiError';

/**
 * @desc    Registrar asistencia por escaneo de QR
 * @route   POST /api/attendances/qr-scan
 * @access  Public (no requiere autenticación — se usa desde la pantalla de login)
 *
 * Body: { dni: string }
 *
 * Lógica:
 * 1. Buscar usuario por DNI
 * 2. Buscar matrícula activa en el año escolar activo
 * 3. Determinar estado según hora: antes de 08:10 → Presente, después → Tardanza
 * 4. Buscar o crear el registro de asistencia del día para esa sección
 * 5. Agregar/actualizar el detalle del estudiante
 */
export const registerQRAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dni } = req.body;

    if (!dni || typeof dni !== 'string' || dni.trim() === '') {
      return next(new ApiError('El DNI es requerido', 400));
    }

    // 1. Buscar usuario por DNI
    const student = await User.findOne({ dni: dni.trim(), role: 'student', status: 'active' });
    if (!student) {
      return next(new ApiError('No se encontró un estudiante activo con ese DNI', 404));
    }

    // 2. Buscar año escolar activo
    const activeSchoolYear = await SchoolYear.findOne({ status: 'Activo' });
    if (!activeSchoolYear) {
      return next(new ApiError('No hay un año escolar activo en el sistema', 400));
    }

    // 3. Buscar matrícula activa del estudiante en el año escolar activo
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      schoolYearId: activeSchoolYear._id,
      status: 'active',
    });
    if (!enrollment) {
      return next(new ApiError(`${student.firstName} ${student.lastName} no tiene matrícula activa este año`, 400));
    }

    // 4. Determinar estado según hora actual
    const now = new Date();
    const hours   = now.getHours();
    const minutes = now.getMinutes();
    // Tardanza si llega después de las 08:00
    const isLate = hours > 8 || (hours === 8);
    const attendanceStatus: 'Presente' | 'Tardanza' = isLate ? 'Tardanza' : 'Presente';

    // 5. Buscar horario de curso para la sección (cualquiera del día)
    const dayOfWeek = now.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const dayNames  = ['0', '1', '2', '3', '4', '5', '6'];

    let courseSchedule = await CourseSchedule.findOne({
      sectionId: enrollment.sectionId,
      dayOfWeek: dayNames[dayOfWeek],
      status: 'Activo',
    });

    // Si no hay horario para hoy, usar cualquier horario activo de la sección
    if (!courseSchedule) {
      courseSchedule = await CourseSchedule.findOne({
        sectionId: enrollment.sectionId,
        status: 'Activo',
      });
    }

    if (!courseSchedule) {
      return next(new ApiError('No se encontró un horario activo para la sección del estudiante', 400));
    }

    // 6. Buscar o crear registro de asistencia del día
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let attendanceRecord = await Attendance.findOne({
      sectionId: enrollment.sectionId,
      courseScheduleId: courseSchedule._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (attendanceRecord) {
      // Actualizar o agregar detalle del estudiante
      const detailIndex = attendanceRecord.details.findIndex(
        (d) => d.studentId.toString() === (student._id as mongoose.Types.ObjectId).toString()
      );
      if (detailIndex > -1) {
        // Ya registrado hoy — actualizar estado
        attendanceRecord.details[detailIndex].status = attendanceStatus;
      } else {
        attendanceRecord.details.push({
          studentId: student._id as mongoose.Types.ObjectId,
          status: attendanceStatus,
        });
      }
      await attendanceRecord.save();
    } else {
      // Crear nuevo registro de asistencia
      attendanceRecord = await Attendance.create({
        date: now,
        sectionId: enrollment.sectionId,
        courseScheduleId: courseSchedule._id,
        teacherId: courseSchedule.teacherId || courseSchedule.sectionId, // fallback
        status: 'Tomada',
        details: [{
          studentId: student._id,
          status: attendanceStatus,
        }],
      });
    }

    res.status(200).json({
      success: true,
      data: {
        studentName: `${student.firstName} ${student.lastName}`,
        dni: student.dni,
        status: attendanceStatus,
        time: now.toISOString(),
        sectionId: enrollment.sectionId,
      },
    });
  } catch (error) {
    next(error);
  }
};
