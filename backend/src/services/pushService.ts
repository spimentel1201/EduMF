import mongoose from 'mongoose';
import PushSubscription from '../models/PushSubscription';
import NotificationLog from '../models/NotificationLog';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:soporte@tucolegio.edu.pe';

let webpush: any = null;
let vapidConfigurado = false;

function obtenerWebPush(): any {
  if (webpush === null) {
    try {
      webpush = require('web-push');
      if (vapidPublicKey && vapidPrivateKey && !vapidConfigurado) {
        try {
          webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
          vapidConfigurado = true;
        } catch (error) {
          console.error('[push] No se pudieron configurar las claves VAPID:', error);
        }
      }
    } catch (error) {
      console.error('[push] No se pudo cargar web-push:', error);
      webpush = false;
    }
  }
  return webpush || null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

export async function enviarPushATutor(
  guardianId: mongoose.Types.ObjectId | string,
  payload: PushPayload,
  dedupeKey: string
): Promise<void> {
  // Deduplicación: si ya existe el dedupeKey, no reenviar.
  const existente = await NotificationLog.findOne({ dedupeKey });
  if (existente) {
    return;
  }

  const subs = await PushSubscription.find({
    guardianId,
    revokedAt: { $exists: false },
  });

  if (subs.length === 0) {
    await NotificationLog.create({
      audience: 'guardian',
      guardianId,
      type: (payload.type as any) || 'entrada',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      dedupeKey,
      status: 'skipped',
      error: 'Sin suscripciones activas',
    });
    return;
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    await NotificationLog.create({
      audience: 'guardian',
      guardianId,
      type: (payload.type as any) || 'entrada',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      dedupeKey,
      status: 'skipped',
      error: 'VAPID no configurado',
    });
    return;
  }

  const wp = obtenerWebPush();
  if (!wp) {
    await NotificationLog.create({
      audience: 'guardian',
      guardianId,
      type: (payload.type as any) || 'entrada',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      dedupeKey,
      status: 'skipped',
      error: 'web-push no disponible',
    });
    return;
  }

  let algunoEnviado = false;
  let ultimoError: string | undefined;

  for (const sub of subs) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        } as any,
        JSON.stringify(payload)
      );
      sub.lastUsedAt = new Date();
      await sub.save();
      algunoEnviado = true;
    } catch (error: any) {
      ultimoError = error?.message || String(error);
      // Suscripción inválida: revocar.
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        sub.revokedAt = new Date();
        await sub.save();
      }
    }
  }

  await NotificationLog.create({
    audience: 'guardian',
    guardianId,
    type: (payload.type as any) || 'entrada',
    title: payload.title,
    body: payload.body,
    url: payload.url,
    dedupeKey,
    status: algunoEnviado ? 'sent' : 'failed',
    error: algunoEnviado ? undefined : ultimoError,
  });
}

export function vapidPublicKeyDisponible(): string | undefined {
  return vapidPublicKey;
}
