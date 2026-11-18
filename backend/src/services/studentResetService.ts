import mongoose from 'mongoose';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Section from '../models/Section';
import Attendance from '../models/Attendance';
import AttendanceDetail from '../models/AttendanceDetail';
import Debt from '../models/Debt';
import Transaction from '../models/Transaction';
import DniEscolar from '../models/DniEscolar';
import EventAttendanceRecord from '../models/EventAttendanceRecord';
import Incident from '../models/Incident';

/**
 * Reinicio de datos de estudiantes.
 *
 * Se usa antes de importar por primera vez el reporte SIAGIE: borra a todos
 * los alumnos y todo lo que cuelga de ellos (matrÃ­culas, asistencia, deudas,
 * pagos, DNI escolar, incidencias y asistencia a eventos). Nunca toca
 * docentes, personal, secciones, cursos, horarios, inventario ni configuraciÃ³n.
 *
 * El borrado exige una frase de confirmaciÃ³n y devuelve un backup JSON con
 * todo lo eliminado para poder restaurarlo si algo saliÃ³ mal.
 */

export const FRASE_CONFIRMACION_RESET = 'BORRAR ESTUDIANTES';

export interface ResetPreview {
  estudiantes: number;
  matriculas: number;
  asistencias: number;
  detallesAsistencia: number;
  deudas: number;
  transacciones: number;
  dniEscolar: number;
  eventos: number;
  incidentes: number;
  seccionesAReiniciar: number;
}

export interface ResetBackup {
  generadoEn: string;
  fraseConfirmacion: string;
  estudiantes: any[];
  matriculas: any[];
  asistencias: any[];
  detallesAsistencia: any[];
  deudas: any[];
  transacciones: any[];
  dniEscolar: any[];
  eventos: any[];
  incidentes: any[];
  secciones: any[];
}

interface DatosReset {
  ids: mongoose.Types.ObjectId[];
  estudiantes: any[];
  matriculas: any[];
  asistencias: any[];
  detallesAsistencia: any[];
  deudas: any[];
  deudaIds: mongoose.Types.ObjectId[];
  transacciones: any[];
  dniEscolar: any[];
  eventos: any[];
  incidentes: any[];
  secciones: any[];
}

/** ReÃºne (sin borrar) todo lo que el reset eliminarÃ­a. */
async function recolectarDatos(session?: mongoose.ClientSession): Promise<DatosReset> {
  const consulta = <T>(query: any) => (session ? query.session(session) : query);

  const estudiantes = await consulta(User.find({ role: 'student' }).select('-password')).lean();
  const ids = estudiantes.map((e: any) => e._id as mongoose.Types.ObjectId);

  if (ids.length === 0) {
    const secciones = await consulta(Section.find({}).select('name currentStudents')).lean();
    return {
      ids: [],
      estudiantes: [],
      matriculas: [],
      asistencias: [],
      detallesAsistencia: [],
      deudas: [],
      deudaIds: [],
      transacciones: [],
      dniEscolar: [],
      eventos: [],
      incidentes: [],
      secciones,
    };
  }

  const matriculas = await consulta(Enrollment.find({ studentId: { $in: ids } })).lean();
  const asistencias = await consulta(
    Attendance.find({ 'details.studentId': { $in: ids } })
  ).lean();
  const detallesAsistencia = await consulta(
    AttendanceDetail.find({ studentId: { $in: ids } })
  ).lean();
  const deudas = await consulta(Debt.find({ studentId: { $in: ids } })).lean();
  const deudaIds = deudas.map((d: any) => d._id as mongoose.Types.ObjectId);
  const transacciones = deudaIds.length
    ? await consulta(Transaction.find({ debtId: { $in: deudaIds } })).lean()
    : [];
  const dniEscolar = await consulta(DniEscolar.find({ studentId: { $in: ids } })).lean();
  const eventos = await consulta(
    EventAttendanceRecord.find({ studentId: { $in: ids } })
  ).lean();
  const incidentes = await consulta(
    Incident.find({ $or: [{ victimId: { $in: ids } }, { aggressorId: { $in: ids } }] })
  ).lean();
  const secciones = await consulta(Section.find({}).select('name currentStudents')).lean();

  return {
    ids,
    estudiantes,
    matriculas,
    asistencias,
    detallesAsistencia,
    deudas,
    deudaIds,
    transacciones,
    dniEscolar,
    eventos,
    incidentes,
    secciones,
  };
}

export async function getResetPreview(): Promise<ResetPreview> {
  const datos = await recolectarDatos();
  return {
    estudiantes: datos.estudiantes.length,
    matriculas: datos.matriculas.length,
    asistencias: datos.asistencias.length,
    detallesAsistencia: datos.detallesAsistencia.length,
    deudas: datos.deudas.length,
    transacciones: datos.transacciones.length,
    dniEscolar: datos.dniEscolar.length,
    eventos: datos.eventos.length,
    incidentes: datos.incidentes.length,
    seccionesAReiniciar: datos.secciones.length,
  };
}

async function borrarDatos(datos: DatosReset, session?: mongoose.ClientSession) {
  const usar = (query: any) => (session ? query.session(session) : query);

  if (datos.transacciones.length > 0) {
    await usar(Transaction.deleteMany({ _id: { $in: datos.transacciones.map((t: any) => t._id) } }));
  }
  if (datos.deudas.length > 0) {
    await usar(Debt.deleteMany({ _id: { $in: datos.deudaIds } }));
  }
  if (datos.dniEscolar.length > 0) {
    await usar(DniEscolar.deleteMany({ _id: { $in: datos.dniEscolar.map((d: any) => d._id) } }));
  }
  if (datos.eventos.length > 0) {
    await usar(EventAttendanceRecord.deleteMany({ _id: { $in: datos.eventos.map((e: any) => e._id) } }));
  }
  if (datos.detallesAsistencia.length > 0) {
    await usar(
      AttendanceDetail.deleteMany({ _id: { $in: datos.detallesAsistencia.map((d: any) => d._id) } })
    );
  }
  if (datos.asistencias.length > 0) {
    const asistenciaIds = datos.asistencias.map((a: any) => a._id);
    // Se quitan solo los detalles de esos alumnos: si un documento mezclara
    // otros estudiantes, no se pierde su informaciÃ³n.
    await usar(
      Attendance.updateMany(
        { _id: { $in: asistenciaIds } },
        { $pull: { details: { studentId: { $in: datos.ids } } } }
      )
    );
    await usar(Attendance.deleteMany({ _id: { $in: asistenciaIds }, details: { $size: 0 } }));
  }
  if (datos.incidentes.length > 0) {
    await usar(Incident.deleteMany({ _id: { $in: datos.incidentes.map((i: any) => i._id) } }));
  }
  if (datos.matriculas.length > 0) {
    await usar(Enrollment.deleteMany({ _id: { $in: datos.matriculas.map((m: any) => m._id) } }));
  }
  if (datos.ids.length > 0) {
    await usar(User.deleteMany({ _id: { $in: datos.ids } }));
  }
  // Los contadores de capacidad parten de cero para la nueva matrÃ­cula
  await usar(Section.updateMany({}, { $set: { currentStudents: 0 } }));
}

export interface ResetResultado {
  backup: ResetBackup;
  resumen: ResetPreview;
}

export async function resetStudents(confirmacion: string): Promise<ResetResultado> {
  const normalizada = String(confirmacion ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (normalizada !== FRASE_CONFIRMACION_RESET) {
    throw new Error(`Debes escribir exactamente "${FRASE_CONFIRMACION_RESET}" para confirmar el borrado.`);
  }

  const session = await mongoose.startSession();
  let datos: DatosReset | undefined;
  let usoTransaccion = true;

  try {
    await session.startTransaction();
    datos = await recolectarDatos(session);
    await borrarDatos(datos, session);
    await session.commitTransaction();
  } catch (error: any) {
    usoTransaccion = false;
    await session.abortTransaction().catch(() => undefined);

    // Si el commit sÃ­ llegÃ³ a aplicarse (error de red al confirmar), no se
    // vuelve a borrar: se conserva el snapshot que ya tenemos.
    const restantes = await User.countDocuments({ role: 'student' });
    if (datos && restantes === 0) {
      console.warn('El borrado ya estaba aplicado; se conserva el backup recolectado.');
    } else {
      console.warn(
        'Reset sin transacciÃ³n (Â¿MongoDB sin replica set?). Se reintenta paso a paso:',
        error?.message
      );
      datos = await recolectarDatos();
      await borrarDatos(datos);
    }
  } finally {
    await session.endSession();
  }

  if (!datos) {
    throw new Error('No se pudo recolectar la informaciÃ³n para el reinicio.');
  }

  const backup: ResetBackup = {
    generadoEn: new Date().toISOString(),
    fraseConfirmacion: FRASE_CONFIRMACION_RESET,
    estudiantes: datos.estudiantes,
    matriculas: datos.matriculas,
    asistencias: datos.asistencias,
    detallesAsistencia: datos.detallesAsistencia,
    deudas: datos.deudas,
    transacciones: datos.transacciones,
    dniEscolar: datos.dniEscolar,
    eventos: datos.eventos,
    incidentes: datos.incidentes,
    secciones: datos.secciones,
  };

  console.log(`Reset de estudiantes ejecutado (transacciÃ³n: ${usoTransaccion}). Backup: ${backup.generadoEn}`);

  return {
    backup,
    resumen: {
      estudiantes: datos.estudiantes.length,
      matriculas: datos.matriculas.length,
      asistencias: datos.asistencias.length,
      detallesAsistencia: datos.detallesAsistencia.length,
      deudas: datos.deudas.length,
      transacciones: datos.transacciones.length,
      dniEscolar: datos.dniEscolar.length,
      eventos: datos.eventos.length,
      incidentes: datos.incidentes.length,
      seccionesAReiniciar: datos.secciones.length,
    },
  };
}
