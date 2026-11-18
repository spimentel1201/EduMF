import mongoose from 'mongoose';
import Attendance, { IAttendance } from '../models/Attendance';

export interface RangoDelDia {
  inicio: Date;
  fin: Date;
}

export type EstadoDetalle = 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';
export type ModoDetalle = 'entrada' | 'salida';

/** Rango local de un día (00:00:00.000 a 23:59:59.999). */
export function rangoDelDia(fecha: Date = new Date()): RangoDelDia {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

/** Fecha normalizada al inicio del día local (clave del registro diario). */
export function diaNormalizado(fecha: Date = new Date()): Date {
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

/** ¿El error corresponde al índice único parcial `{ sectionId, date }`? */
function esConflictoDelRegistroDiario(error: any): boolean {
  if (error?.code !== 11000) return false;
  const keyPattern = error?.keyPattern || {};
  return Boolean(keyPattern.sectionId || keyPattern.date);
}

let indiceDiarioListo: Promise<void> | null = null;

/**
 * Crea/sincroniza el índice único parcial del registro diario.
 *
 * Mongoose lo crea en `autoIndex`, pero si ese build falla el error solo se
 * emite por el evento `index` del modelo. Se fuerza aquí una vez por proceso
 * para que la unicidad no dependa de una ventana de arranque.
 */
export function asegurarIndiceDiario(): Promise<void> {
  if (!indiceDiarioListo) {
    indiceDiarioListo = Attendance.createIndexes()
      .then(() => undefined)
      .catch((error: any) => {
        indiceDiarioListo = null;
        console.error(
          '[asistencia] No se pudo crear el índice único del registro diario:',
          error?.message ?? error
        );
      });
  }
  return indiceDiarioListo;
}

/**
 * Busca cualquier registro de asistencia de la sección para el día.
 * Se prioriza el registro diario para que una sección nunca tenga dos
 * documentos del mismo día con los detalles repartidos.
 */
export async function buscarRegistroDeSeccionDelDia(
  sectionId: mongoose.Types.ObjectId | string,
  fecha: Date = new Date()
): Promise<IAttendance | null> {
  const { inicio, fin } = rangoDelDia(fecha);
  return Attendance.findOne({
    sectionId,
    date: { $gte: inicio, $lte: fin },
  }).sort({ diario: -1, createdAt: 1 });
}

/**
 * Busca el registro diario por sección (sin `courseScheduleId`).
 * Es el fallback de D1 para secciones que no tienen horario configurado.
 */
export async function buscarAsistenciaDelDia(
  sectionId: mongoose.Types.ObjectId | string,
  fecha: Date = new Date()
): Promise<IAttendance | null> {
  const { inicio, fin } = rangoDelDia(fecha);
  return Attendance.findOne({
    sectionId,
    diario: true,
    date: { $gte: inicio, $lte: fin },
  });
}

export interface RegistroAsistenciaParams {
  sectionId: mongoose.Types.ObjectId | string;
  fecha?: Date;
  teacherId?: mongoose.Types.ObjectId | string;
  /** Si la sección tiene horario, se guarda como referencia del registro. */
  courseScheduleId?: mongoose.Types.ObjectId | string;
  status?: 'Pendiente' | 'Tomada' | 'Finalizada';
}

/**
 * Devuelve el registro de asistencia canónico de la sección para el día.
 *
 * - Reutiliza cualquier registro ya existente (diario o ligado a un horario).
 * - Si no existe, crea el registro diario (D1) o, cuando hay horario, uno
 *   ligado a ese horario.
 * - El índice único parcial `{ sectionId, date }` (solo `diario: true`) evita
 *   duplicados con dos auxiliares escaneando a la vez; si hay choque se relee
 *   el registro ganador.
 */
export async function obtenerOCrearRegistroAsistencia(
  params: RegistroAsistenciaParams
): Promise<IAttendance> {
  const {
    sectionId,
    fecha = new Date(),
    teacherId,
    courseScheduleId,
    status = 'Tomada',
  } = params;

  const existente = await buscarRegistroDeSeccionDelDia(sectionId, fecha);
  if (existente) {
    return existente;
  }

  await asegurarIndiceDiario();

  try {
    return await Attendance.create({
      date: courseScheduleId ? fecha : diaNormalizado(fecha),
      sectionId,
      ...(courseScheduleId ? { courseScheduleId } : { diario: true }),
      ...(teacherId ? { teacherId } : {}),
      status,
      details: [],
    });
  } catch (error) {
    if (esConflictoDelRegistroDiario(error)) {
      const ganador = await buscarRegistroDeSeccionDelDia(sectionId, fecha);
      if (ganador) {
        return ganador;
      }
    }
    throw error;
  }
}

export interface AsistenciaDelDiaParams {
  sectionId: mongoose.Types.ObjectId | string;
  fecha?: Date;
  teacherId?: mongoose.Types.ObjectId | string;
  status?: 'Pendiente' | 'Tomada' | 'Finalizada';
}

/** Variante de `obtenerOCrearRegistroAsistencia` que siempre crea el diario. */
export async function obtenerOCrearAsistenciaDelDia(
  params: AsistenciaDelDiaParams
): Promise<IAttendance> {
  return obtenerOCrearRegistroAsistencia(params);
}

export interface ActualizarDetalleParams {
  attendanceId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  status: EstadoDetalle;
  modo?: ModoDetalle;
  fecha?: Date;
}

/**
 * Inserta o actualiza el detalle de un alumno con operaciones atómicas.
 *
 * No usa `save()` del documento completo: dos escaneos simultáneos sobre el
 * mismo registro ya no se pisan (Mongoose reemplazaría todo el array
 * `details`). La entrada conserva la primera hora registrada del día.
 */
export async function actualizarDetalleAsistencia(
  params: ActualizarDetalleParams
): Promise<void> {
  const { attendanceId, studentId, status, modo = 'entrada', fecha = new Date() } = params;

  if (modo === 'salida') {
    const actualizado = await Attendance.updateOne(
      { _id: attendanceId, 'details.studentId': studentId },
      { $set: { 'details.$.horaSalida': fecha } }
    );
    if (actualizado.matchedCount > 0) {
      return;
    }
    await Attendance.updateOne(
      { _id: attendanceId, 'details.studentId': { $ne: studentId } },
      { $push: { details: { studentId, status, horaSalida: fecha } } }
    );
    return;
  }

  // Entrada: fija la hora solo si el detalle existe y aún no tiene una.
  const primeraEntrada = await Attendance.updateOne(
    {
      _id: attendanceId,
      details: { $elemMatch: { studentId, horaEntrada: { $exists: false } } },
    },
    { $set: { 'details.$.horaEntrada': fecha, 'details.$.status': status } }
  );
  if (primeraEntrada.modifiedCount > 0) {
    return;
  }

  const yaRegistrado = await Attendance.updateOne(
    { _id: attendanceId, 'details.studentId': studentId },
    { $set: { 'details.$.status': status } }
  );
  if (yaRegistrado.matchedCount > 0) {
    return;
  }

  await Attendance.updateOne(
    { _id: attendanceId, 'details.studentId': { $ne: studentId } },
    { $push: { details: { studentId, status, horaEntrada: fecha } } }
  );
}
