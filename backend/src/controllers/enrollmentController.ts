import { Request, Response } from 'express';
import { createEnrollment, bulkCreateEnrollments } from '../services/enrollmentService';
import { parseCSV } from '../utils/csvParser'; // Asumimos que tienes un parser CSV

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

    const enrollmentsData = parseCSV(req.file.buffer.toString()); // Asume que el archivo es CSV
    const createdEnrollments = await bulkCreateEnrollments(enrollmentsData);
    res.status(201).json(createdEnrollments);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};