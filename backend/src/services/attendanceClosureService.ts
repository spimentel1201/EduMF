import mongoose from 'mongoose';
import InstitutionConfig, { conValoresPorDefecto } from '../models/InstitutionConfig';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import SchoolYear from '../models/SchoolYear';
import Attendance from '../models/Attendance';
import Guardian from '../models/Guardian';
import { enviarPushATutor } from '../services/pushService';

let ejecutando = false;

function horaActual(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function coincideHora(actual: string, configurada: string): boolean {
  // Margen de 1 minuto.
  const [ah, am] = actual.split(':').map(Number);
  const [ch, cm] = configurada.split(':').map(Number);
  const diff = Math.abs((ah * 60 + am) - (ch * 60 + cm));
  return diff <= 1;
}

export async function ejecutarCierreTurno(): Promise<void> {
  if (ejecutando) return;
  ejecutando = true;
  try {
    const config = conValoresPorDefecto(await InstitutionConfig.findOne({}).lean());
    if (!config.portalHabilitado || !config.avisarFaltaSinRegistro) return;

    const actual = horaActual();
    const horaConfigurada = (config.horasCierreTurno || []).find((h: string) => coincideHora(actual, h));
    if (!horaConfigurada) return;

    const activeSchoolYear = await SchoolYear.findOne({ status: 'Activo' });
    if (!activeSchoolYear) return;

    const enrollments = await Enrollment.find({ schoolYearId: activeSchoolYear._id, status: 'active' })
      .select('studentId sectionId');
    const studentIds = enrollments.map((e: any) => e.studentId);

    const students = await User.find({ _id: { $in: studentIds }, role: 'student', status: 'active' })
      .select('firstName lastName');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const asistencias = await Attendance.find({
      date: { $gte: hoy, $lt: manana },
      'details.studentId': { $in: studentIds },
    }).select('details.studentId');

    const conRegistro = new Set<string>();
    for (const reg of asistencias as any[]) {
      for (const det of reg.details || []) {
        conRegistro.add(String(det.studentId));
      }
    }

    const dia = new Date().toISOString().slice(0, 10);

    for (const student of students as any[]) {
      const sid = String(student._id);
      if (conRegistro.has(sid)) continue;

      const tutores = await Guardian.find({ students: student._id, status: 'active' }).select('_id');
      for (const tutor of tutores) {
        await enviarPushATutor(
          tutor._id,
          {
            title: 'Sin registro de asistencia',
            body: `${student.firstName} ${student.lastName} no tiene registro de asistencia hoy.`,
            url: '/portal',
            type: 'sin_registro',
          },
          `${student._id}-sin_registro-${horaConfigurada}-${dia}`
        );
      }
    }
  } catch (error) {
    console.error('[cierre] Error en cierre de turno:', error);
  } finally {
    ejecutando = false;
  }
}
