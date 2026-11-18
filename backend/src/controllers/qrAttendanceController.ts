import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import CourseSchedule from '../models/CourseSchedule';
import SchoolYear from '../models/SchoolYear';
import Section from '../models/Section';
import AttendanceScan from '../models/AttendanceScan';
import Guardian from '../models/Guardian';
import { enviarPushATutor } from '../services/pushService';
import { ApiError } from '../middleware/errorHandler';
import {
  obtenerHorarioAsistencia,
  clasificarEntrada,
  esSalidaAnticipada,
} from '../services/attendanceScheduleService';
import {
  actualizarDetalleAsistencia,
  obtenerOCrearRegistroAsistencia,
} from '../services/attendanceDayService';

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

    // El docente de la sección solo se consulta si el horario no lo aporta.
    let teacherId = courseSchedule?.teacherId;
    if (!teacherId) {
      const section = await Section.findById(enrollment.sectionId).select('teacherId');
      teacherId = section?.teacherId;
    }

    // 6. Obtener el registro canónico de la sección para hoy.
    //    D1: si la sección no tiene horarios, se usa un registro diario por
    //    sección (sin courseScheduleId). El escaneo ya no falla por eso.
    const attendanceRecord = await obtenerOCrearRegistroAsistencia({
      sectionId: enrollment.sectionId,
      fecha: now,
      courseScheduleId: courseSchedule?._id,
      teacherId,
    });

    // 7. Actualizar o agregar el detalle del estudiante con operaciones
    //    atómicas: dos escaneos simultáneos ya no se pisan.
    await actualizarDetalleAsistencia({
      attendanceId: attendanceRecord._id,
      studentId: student._id as mongoose.Types.ObjectId,
      status: attendanceStatus,
      modo,
      fecha: now,
    });

    // 7b. Registro idempotente del escaneo (cola offline).
    const clientScanId = String(req.body?.clientScanId || `${student._id}-${modo}-${now.getTime()}`);
    try {
      await AttendanceScan.create({
        clientScanId,
        studentId: student._id,
        tipo: modo,
        scannedAt: now,
        attendanceId: attendanceRecord._id,
        source: req.body?.source === 'offline' ? 'offline' : 'online',
      });
    } catch (error: any) {
      // Duplicado: ignorar.
      if (error?.code !== 11000) {
        console.error('[qr] No se pudo registrar el escaneo:', error?.message ?? error);
      }
    }

    // 7c. Notificar a los tutores (fire and forget).
    void (async () => {
      try {
        const tutores = await Guardian.find({ students: student._id, status: 'active' }).select('_id');
        const dia = now.toISOString().slice(0, 10);
        const tipoNotificacion = modo === 'salida'
          ? 'salida'
          : attendanceStatus === 'Tardanza'
            ? 'tardanza'
            : 'entrada';
        const titulo = modo === 'salida'
          ? 'Salida registrada'
          : attendanceStatus === 'Tardanza'
            ? 'Tardanza registrada'
            : 'Entrada registrada';
        const cuerpo = `${student.firstName} ${student.lastName} - ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
        for (const tutor of tutores) {
          await enviarPushATutor(
            tutor._id,
            { title: titulo, body: cuerpo, url: '/portal', type: tipoNotificacion },
            `${student._id}-${modo}-${tipoNotificacion}-${dia}`
          );
        }
      } catch (error) {
        console.error('[qr] Error notificando tutores:', error);
      }
    })();

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
