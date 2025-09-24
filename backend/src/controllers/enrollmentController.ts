import { Request, Response } from 'express';
import { createEnrollment, bulkCreateEnrollments } from '../services/enrollmentService';
import { parseCSV } from '../utils/csvParser';
import User from '../models/User'; // Importar el modelo de Usuario
import Section from '../models/Section'; // Importar el modelo de Sección
import SchoolYear from '../models/SchoolYear'; // Importar el modelo de Año Escolar

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const enrollment = await createEnrollment(req.body);
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkEnrollStudents = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    const csvData = parseCSV(req.file.buffer.toString());

    const enrollmentsDataWithIds = await Promise.all(
      csvData.map(async (row: any) => {
        // Buscar estudiante por nombre completo (asumiendo "Nombre Apellido")
        const studentNameParts = row.studentName.split(' ');
        const firstName = studentNameParts[0];
        const lastName = studentNameParts.slice(1).join(' '); // Manejar apellidos compuestos

        const student = await User.findOne({ firstName, lastName, role: 'student' });
        const section = await Section.findOne({ name: row.sectionName });
        const schoolYear = await SchoolYear.findOne({ year: row.schoolYearName });

        if (!student) {
          throw new Error(`Estudiante no encontrado: ${row.studentName}`);
        }
        if (!section) {
          throw new Error(`Sección no encontrada: ${row.sectionName}`);
        }
        if (!schoolYear) {
          throw new Error(`Año escolar no encontrado: ${row.schoolYearName}`);
        }

        return {
          studentId: student._id,
          sectionId: section._id,
          schoolYearId: schoolYear._id,
          enrollmentDate: row.enrollmentDate,
        };
      })
    );

    const createdEnrollments = await bulkCreateEnrollments(enrollmentsDataWithIds);
    res.status(201).json(createdEnrollments);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};