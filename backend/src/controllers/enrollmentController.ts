import { Request, Response } from 'express';
import { createEnrollment } from '../services/enrollmentService';
import User, { IUser } from '../models/User'; // Importar el modelo de Usuario
import Section from '../models/Section'; // Importar el modelo de Sección
import SchoolYear from '../models/SchoolYear'; // Importar el modelo de Año Escolar
import mongoose from 'mongoose'; // Importar mongoose para transacciones
import Enrollment from '../models/Enrollment';
import * as XLSX from 'xlsx';

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const enrollment = await createEnrollment(req.body);
    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const bulkEnrollStudents = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
  }

  const { schoolYearName, sectionName } = req.body;

  if (!schoolYearName) {
    return res.status(400).json({ message: 'El nombre del año escolar es requerido.' });
  }
  if (!sectionName) {
    return res.status(400).json({ message: 'El nombre de la sección es requerido.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Extract student data starting from row 12 (index 11)
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 11 });

    const studentsToEnroll = jsonData.map((row: any) => ({
      firstName: row[0], // NOMBRES
      lastName: row[1],  // APELLIDOS
      dni: row[2],       // DNI
      gender: row[3],    // GENERO
      birthDate: row[4], // FECHA_NAC
    }));

    const section = await Section.findOne({ name: sectionName }).session(session);
    if (!section) {
      throw new Error(`Sección '${sectionName}' no encontrada en la base de datos.`);
    }

    const schoolYear = await SchoolYear.findOne({ name: schoolYearName }).session(session);
    if (!schoolYear) {
      throw new Error(`Año escolar '${schoolYearName}' no encontrado.`);
    }

    const createdEnrollments = [];
    const errors = [];

    for (const studentData of studentsToEnroll) {
      const { dni, firstName, lastName } = studentData;

      if (!dni || !firstName || !lastName) {
        errors.push(`Datos incompletos para un estudiante: ${JSON.stringify(studentData)}`);
        continue;
      }

      try {
        let student = await User.findOne({ dni: String(dni) }).session(session);

        if (!student) {
          const generatedEmail = `${firstName.substring(0, 2).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}${dni}@escuela.com`;
          [student] = await User.create([{
            dni: String(dni),
            firstName: String(firstName),
            lastName: String(lastName),
            email: generatedEmail,
            role: 'student',
            password: String(dni), // Contraseña temporal
          }], { session });
        } else if (student.role !== 'student') {
          throw new Error(`El usuario con DNI ${dni} ya existe pero no es un estudiante.`);
        }

        const existingEnrollment = await Enrollment.findOne({
          studentId: student._id,
          sectionId: section._id,
          schoolYearId: schoolYear._id
        }).session(session);

        if (existingEnrollment) {
          console.log(`El estudiante ${student.firstName} ${student.lastName} ya está matriculado.`);
          continue;
        }

        if (section.currentStudents >= section.maxStudents) {
          throw new Error(`La sección '${section.name}' ha alcanzado su capacidad máxima.`);
        }

        const enrollment = new Enrollment({
          studentId: student._id,
          sectionId: section._id,
          schoolYearId: schoolYear._id,
          level: section._id, // Asignar el ID de la sección como el nivel
        });
        await enrollment.save({ session });
        createdEnrollments.push(enrollment);

        section.currentStudents += 1;

      } catch (error: any) {
        errors.push(`Error procesando DNI ${dni}: ${error.message}`);
      }
    }

    await section.save({ session });

    if (errors.length > 0) {
      throw new Error(`Ocurrieron errores: ${errors.join('; ')}`);
    }

    await session.commitTransaction();
    res.status(201).json({
      message: 'Matrícula masiva completada con éxito.',
      data: { createdEnrollments }
    });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error en matrícula masiva:', error);
    res.status(500).json({ message: error.message || 'Error en la matrícula masiva.' });
  } finally {
    session.endSession();
  }
};

export const getStudentsBySection = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;

    if (!sectionId) {
      return res.status(400).json({ message: 'El ID de la sección es requerido.' });
    }

    const enrollments = await Enrollment.find({ sectionId })
      .populate('studentId', 'firstName lastName dni') // Popula solo los campos necesarios del estudiante
      .exec();

    const students = enrollments.map(enrollment => enrollment.studentId);

    res.status(200).json(students);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al obtener estudiantes por sección.' });
  }
};

