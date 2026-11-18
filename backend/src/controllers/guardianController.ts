import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import Guardian from '../models/Guardian';
import User from '../models/User';
import Attendance from '../models/Attendance';
import { ApiError } from '../middleware/errorHandler';
import { importGuardians } from '../services/guardianImportService';

function normalizarLogin(valor?: string | null): string {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const loginGuardian = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }

    const { loginId, password } = req.body;
    const identificador = normalizarLogin(loginId);
    if (!identificador) {
      return next(ApiError.badRequest('El identificador de acceso es requerido.'));
    }

    const guardian = await Guardian.findOne({
      $or: [{ loginId: identificador }, { aliases: identificador }],
    }).select('+password');

    if (!guardian || guardian.status !== 'active') {
      return next(ApiError.unauthorized('Credenciales inválidas'));
    }

    // Bloqueo por intentos (simple).
    if (guardian.lockUntil && guardian.lockUntil > new Date()) {
      return next(ApiError.unauthorized('Cuenta bloqueada temporalmente. Intente más tarde.'));
    }

    let passwordOk = false;
    const clave = String(password ?? '').trim();
    if (guardian.hasCustomPassword && guardian.password) {
      passwordOk = await guardian.comparePassword(clave);
    } else {
      // Clave inicial: el identificador o cualquiera de sus alias.
      const aceptables = [guardian.loginId, ...(guardian.aliases || [])].map(normalizarLogin);
      passwordOk = aceptables.includes(normalizarLogin(clave));
    }

    if (!passwordOk) {
      guardian.loginAttempts = (guardian.loginAttempts || 0) + 1;
      if (guardian.loginAttempts >= 5) {
        guardian.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await guardian.save();
      return next(ApiError.unauthorized('Credenciales inválidas'));
    }

    guardian.loginAttempts = 0;
    guardian.lockUntil = undefined;
    guardian.lastLoginAt = new Date();
    if (!guardian.hasCustomPassword) {
      guardian.identityVerifiedAt = guardian.identityVerifiedAt || new Date();
    }
    await guardian.save();

    const token = guardian.generateAuthToken();
    res.status(200).json({
      success: true,
      data: {
        token,
        guardian: {
          id: guardian._id,
          loginId: guardian.loginId,
          nombres: guardian.nombres,
          telefono: guardian.telefono,
          email: guardian.email,
          hasCustomPassword: guardian.hasCustomPassword,
          identityVerified: Boolean(guardian.identityVerifiedAt),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getGuardianMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guardian = await Guardian.findById(req.guardian.id).select('-password');
    if (!guardian) return next(ApiError.notFound('Tutor no encontrado.'));
    const students = await User.find({ _id: { $in: guardian.students } })
      .select('firstName lastName dni codigoEstudiante birthdate status');
    res.status(200).json({
      success: true,
      data: { guardian, students },
    });
  } catch (error) {
    next(error);
  }
};

export const getGuardianChildrenAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guardian = await Guardian.findById(req.guardian.id);
    if (!guardian) return next(ApiError.notFound('Tutor no encontrado.'));

    const studentIds = guardian.students || [];
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    desde.setHours(0, 0, 0, 0);

    const registros = await Attendance.find({
      'details.studentId': { $in: studentIds },
      date: { $gte: desde },
    })
      .sort({ date: -1 })
      .lean();

    const porAlumno: Record<string, any[]> = {};
    for (const reg of registros as any[]) {
      for (const det of reg.details || []) {
        const sid = String(det.studentId);
        if (!studentIds.map(String).includes(sid)) continue;
        if (!porAlumno[sid]) porAlumno[sid] = [];
        porAlumno[sid].push({
          fecha: reg.date,
          status: det.status,
          horaEntrada: det.horaEntrada,
          horaSalida: det.horaSalida,
          sectionId: reg.sectionId,
        });
      }
    }

    res.status(200).json({ success: true, data: porAlumno });
  } catch (error) {
    next(error);
  }
};

export const updateGuardianPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }
    const { currentPassword, newPassword } = req.body;
    const guardian = await Guardian.findById(req.guardian.id).select('+password');
    if (!guardian) return next(ApiError.notFound('Tutor no encontrado.'));

    if (guardian.hasCustomPassword) {
      const ok = await guardian.comparePassword(String(currentPassword ?? ''));
      if (!ok) return next(ApiError.badRequest('Contraseña actual incorrecta'));
    }

    guardian.password = String(newPassword);
    guardian.hasCustomPassword = true;
    guardian.passwordResetAt = new Date();
    await guardian.save();

    res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    next(error);
  }
};

export const importGuardiansEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dryRun = req.body?.dryRun === true || req.body?.dryRun === 'true';
    const reporte = await importGuardians({ dryRun, escribirCsv: !dryRun });
    res.status(200).json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
};
