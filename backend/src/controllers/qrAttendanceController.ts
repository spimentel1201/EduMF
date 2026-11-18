import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Attendance from '../models/Attendance';
import CourseSchedule from '../models/CourseSchedule';
import SchoolYear from '../models/SchoolYear';
import { ApiError } from '../middleware/errorHandler';
import {
  obtenerHorarioAsistencia,
  clasificarEntrada,
  esSalidaAnticipada,
} from '../services/attendanceScheduleService';

/**
 * @desc    Obtener el horario de asistencia configurado (ingreso, salida y tolerancia)
 * @route   GET /api/attendances/schedule
 * @access  Private
 */
export const getAttendanceSchedule = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const horario = await obtenerHorarioAsistencia();
    res.status(200).json({
      success: true,
      data: { ...horario, horaServidor: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar asistencia por escaneo de QR
 * @route   POST /api/attendances/qr-scan
 * @access  Public (no requiere autenticación — se usa desde la pantalla de login)
 *
 * Body: { dni: string, tipo?: 'entrada' | 'salida' }
 *
 * Lógica:
 * 1. Buscar usuario por DNI
 * 2. Buscar matrícula activa en el año escolar activo
 * 3. Entrada: Presente si llega hasta la hora de ingreso + tolerancia
 *    configurada en Configuración Institucional; si llega después → Tardanza
 *    Salida: guarda la hora y avisa si es antes de la hora de salida configurada
 * 4. Buscar o crear el registro de asistencia del día para esa sección
 * 5. Agregar/actualizar el detalle del estudiante
 */
export const registerQRAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dni, tipo } = req.body;
    const modo = tipo === 'salida' ? 'salida' : 'entrada';

    if (!dni || typeof dni !== 'string' || dni.trim() === '') {
      return next(ApiError.badRequest('El DNI es requerido'));
    }

    // 1. Buscar usuario por DNI
    const student = await User.findOne({ dni: dni.trim(), role: 'student', status: 'active' });
    if (!student) {
      return next(ApiError.notFound('No se encontró un estudiante activo con ese DNI'));
    }

    // 2. Buscar año escolar activo
    const activeSchoolYear = await SchoolYear.findOne({ status: 'Activo' });
    if (!activeSchoolYear) {
      return next(ApiError.badRequest('No hay un año escolar activo en el sistema'));
    }

    // 3. Buscar matrícula activa del estudiante en el año escolar activo
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      schoolYearId: activeSchoolYear._id,
      status: 'active',
    });
    if (!enrollment) {
      return next(ApiError.badRequest(`${student.firstName} ${student.lastName} no tiene matrícula activa este año`));
    }

    // 4. Determinar estado según el horario configurado por la institución
    const now = new Date();
    const horario = await obtenerHorarioAsistencia();
    const attendanceStatus: 'Presente' | 'Tardanza' = clasificarEntrada(now, horario);
    const salidaAnticipada = modo === 'salida' && esSalidaAnticipada(now, horario);

    // 5. Buscar el horario de hoy para la sección (dayOfWeek usa nombres en español)
    const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = DIAS_SEMANA[now.getDay()];

    let courseSchedule = await CourseSchedule.findOne({
      sectionId: enrollment.sectionId,
      dayOfWeek: diaHoy,
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
      return next(ApiError.badRequest('La sección del estudiante no tiene horarios registrados. Configura el horario de la sección para habilitar el escaneo QR.'));
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
        if (modo === 'salida') {
          // Registro de salida: guarda la hora sin tocar el estado de entrada
          attendanceRecord.details[detailIndex].horaSalida = now;
        } else if (!attendanceRecord.details[detailIndex].horaEntrada) {
          // Entrada (re-escaneo): actualiza el estado pero conserva la
          // PRIMERA hora de entrada registrada en el día
          attendanceRecord.details[detailIndex].horaEntrada = now;
          attendanceRecord.details[detailIndex].status = attendanceStatus;
        } else {
          attendanceRecord.details[detailIndex].status = attendanceStatus;
        }
      } else {
        attendanceRecord.details.push({
          studentId: student._id as mongoose.Types.ObjectId,
          status: attendanceStatus,
          ...(modo === 'entrada' ? { horaEntrada: now } : { horaSalida: now }),
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
          ...(modo === 'entrada' ? { horaEntrada: now } : { horaSalida: now }),
        }],
      });
    }

    res.status(200).json({
      success: true,
      data: {
        studentName: `${student.firstName} ${student.lastName}`,
        dni: student.dni,
        status: modo === 'salida' ? 'Salida' : attendanceStatus,
        tipo: modo,
        time: now.toISOString(),
        sectionId: enrollment.sectionId,
        horario,
        salidaAnticipada,
        mensaje: modo === 'salida' && salidaAnticipada
          ? `Salida anticipada: la hora de salida configurada es ${horario.horaSalida}.`
          : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};
