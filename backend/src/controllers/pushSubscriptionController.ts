import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import PushSubscription from '../models/PushSubscription';
import { vapidPublicKeyDisponible } from '../services/pushService';
import { ApiError } from '../middleware/errorHandler';

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest('Error de validación', errors.array()));
    }
    const guardianId = req.guardian.id;
    const { endpoint, keys, deviceLabel, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return next(ApiError.badRequest('Suscripción inválida.'));
    }

    // Revocar duplicados del mismo endpoint si existieran.
    await PushSubscription.updateMany(
      { endpoint, guardianId: { $ne: guardianId } },
      { $set: { revokedAt: new Date() } }
    );

    const existente = await PushSubscription.findOne({ endpoint });
    if (existente) {
      existente.guardianId = guardianId;
      existente.keys = { p256dh: keys.p256dh, auth: keys.auth };
      existente.deviceLabel = deviceLabel;
      existente.userAgent = userAgent || req.headers['user-agent'];
      existente.revokedAt = undefined;
      existente.lastUsedAt = new Date();
      await existente.save();
      return res.status(200).json({ success: true, data: existente });
    }

    // Límite de 2 activas por tutor: revocar la más antigua.
    const activas = await PushSubscription.find({ guardianId, revokedAt: { $exists: false } })
      .sort({ lastUsedAt: 1 });
    if (activas.length >= 2) {
      const vieja = activas[0];
      vieja.revokedAt = new Date();
      await vieja.save();
    }

    const creada = await PushSubscription.create({
      guardianId,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      deviceLabel,
      userAgent: userAgent || req.headers['user-agent'],
      lastUsedAt: new Date(),
    });

    res.status(201).json({ success: true, data: creada });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return next(ApiError.badRequest('Endpoint requerido.'));
    await PushSubscription.updateOne(
      { endpoint, guardianId: req.guardian.id },
      { $set: { revokedAt: new Date() } }
    );
    res.status(200).json({ success: true, message: 'Suscripción revocada.' });
  } catch (error) {
    next(error);
  }
};

export const getVapidPublicKey = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const key = vapidPublicKeyDisponible();
    if (!key) {
      return next(ApiError.badRequest('Notificaciones push no configuradas.'));
    }
    res.status(200).json({ success: true, data: { publicKey: key } });
  } catch (error) {
    next(error);
  }
};

export const listSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subs = await PushSubscription.find({ guardianId: req.guardian.id, revokedAt: { $exists: false } });
    res.status(200).json({ success: true, data: subs });
  } catch (error) {
    next(error);
  }
};
