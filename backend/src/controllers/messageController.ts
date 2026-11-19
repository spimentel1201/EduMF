import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Message from '../models/Message';
import Guardian from '../models/Guardian';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import SchoolYear from '../models/SchoolYear';
import Section from '../models/Section';
import { ApiError } from '../middleware/errorHandler';
import { enviarPushATutor } from '../services/pushService';

async function tutoresDestinatarios(message: any): Promise<any[]> {
  let studentIds: mongoose.Types.ObjectId[] = [];

  if (message.audience === 'all') {
    const students = await User.find({ role: 'student', status: 'active' }).select('_id');
    studentIds = students.map((s: any) => s._id);
  } else if (message.audience === 'section' && message.sectionId) {
    const enrollments = await Enrollment.find({ sectionId: message.sectionId, status: 'active' }).select('studentId');
    studentIds = enrollments.map((e: any) => e.studentId);
  } else if (message.audience === 'students') {
    studentIds = message.studentIds || [];
  }

  const guardians = await Guardian.find({ students: { $in: studentIds }, status: 'active' });
  return guardians;
}

export const createMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { title, body, imageUrl, audience, sectionId, studentIds } = req.body;

    if (!title || !body) {
      return next(ApiError.badRequest('Título y descripción son requeridos.'));
    }

    if (audience === 'section' && !sectionId) {
      return next(ApiError.badRequest('La sección es requerida.'));
    }
    if (audience === 'students' && (!studentIds || studentIds.length === 0)) {
      return next(ApiError.badRequest('Debe seleccionar al menos un estudiante.'));
    }

    const message = await Message.create({
      title: String(title).trim(),
      body: String(body).trim(),
      imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
      audience,
      sectionId: sectionId || undefined,
      studentIds: studentIds || undefined,
      senderId: (req as any).user._id || (req as any).user.id,
      senderRole: (req as any).user.role,
    });

    // Push (fire and forget)
    void (async () => {
      try {
        const guardians = await tutoresDestinatarios(message);
        for (const g of guardians) {
          await enviarPushATutor(
            g._id,
            { title: `Nuevo comunicado: ${message.title}`, body: message.title, url: '/portal/comunicados', type: 'justificacion' },
            `message-${message._id}-${g._id}`
          );
        }
      } catch (e) {
        console.error('[messages] Error enviando push:', e);
      }
    })();

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const listMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guardian = (req as any).guardian;
    if (!guardian) return next(ApiError.unauthorized('Tutor no autenticado.'));

    const studentIds = guardian.students || [];
    // secciones de los hijos
    const activeYear = await SchoolYear.findOne({ status: 'Activo' });
    const enrollments = activeYear
      ? await Enrollment.find({ studentId: { $in: studentIds }, schoolYearId: activeYear._id, status: 'active' }).select('sectionId')
      : [];
    const sectionIds = [...new Set(enrollments.map((e: any) => String(e.sectionId)))];

    const messages = await Message.find({
      $or: [
        { audience: 'all' },
        { audience: 'section', sectionId: { $in: sectionIds } },
        { audience: 'students', studentIds: { $in: studentIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const getMessageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = await Message.findById(req.params.id).lean();
    if (!message) return next(ApiError.notFound('Comunicado no encontrado.'));
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guardian = (req as any).guardian;
    if (!guardian) return next(ApiError.unauthorized('Tutor no autenticado.'));

    await Message.updateOne(
      { _id: req.params.id },
      { $addToSet: { readBy: guardian._id } }
    );
    res.status(200).json({ success: true, message: 'Marcado como leído.' });
  } catch (error) {
    next(error);
  }
};

export const listSentMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await Message.find({ senderId: (req as any).user._id || (req as any).user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};
