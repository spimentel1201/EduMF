import express from 'express';
import { body } from 'express-validator';
import * as pushController from '../controllers/pushSubscriptionController';
import { protectGuardian } from '../middleware/authMiddleware';

const router = express.Router();

const subscribeValidation = [
  body('endpoint').notEmpty().withMessage('El endpoint es requerido'),
  body('keys.p256dh').notEmpty().withMessage('La clave p256dh es requerida'),
  body('keys.auth').notEmpty().withMessage('La clave auth es requerida'),
];

router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', protectGuardian, subscribeValidation, pushController.subscribe);
router.post('/unsubscribe', protectGuardian, pushController.unsubscribe);
router.get('/', protectGuardian, pushController.listSubscriptions);

export default router;
