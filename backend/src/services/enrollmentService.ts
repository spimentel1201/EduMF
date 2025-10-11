import Enrollment, { IEnrollment } from '../models/Enrollment';
import User from '../models/User';
import Section from '../models/Section';
import SchoolYear from '../models/SchoolYear';

export const createEnrollment = async (enrollmentData: Partial<IEnrollment>): Promise<IEnrollment> => {
  const { studentId, sectionId, schoolYearId } = enrollmentData;

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    throw new Error('Estudiante no encontrado o no es un estudiante válido.');
  }

  const section = await Section.findById(sectionId);
  if (!section) {
    throw new Error('Sección no encontrada.');
  }

  const schoolYear = await SchoolYear.findById(schoolYearId);
  if (!schoolYear) {
    throw new Error('Año escolar no encontrado.');
  }

  const existingEnrollment = await Enrollment.findOne({ studentId, sectionId, schoolYearId });
  if (existingEnrollment) {
    throw new Error('El estudiante ya está matriculado en esta sección para el año escolar actual.');
  }

  if (section.currentStudents >= section.maxStudents) {
    throw new Error('La sección ha alcanzado su capacidad máxima de estudiantes.');
  }
  section.currentStudents += 1;
  await section.save();

  const enrollment = new Enrollment(enrollmentData);
  await enrollment.save();
  return enrollment;
};

export const bulkCreateEnrollments = async (enrollmentsData: Partial<IEnrollment>[]): Promise<IEnrollment[]> => {
  const createdEnrollments: IEnrollment[] = [];
  const errors: string[] = [];

  for (const enrollmentData of enrollmentsData) {
    try {
      const enrollment = await createEnrollment(enrollmentData);
      createdEnrollments.push(enrollment);
    } catch (error: any) {
      errors.push(`Error al matricular estudiante ${enrollmentData.studentId}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Errores en la matrícula masiva: ${errors.join('; ')}`);
  }

  return createdEnrollments;
};