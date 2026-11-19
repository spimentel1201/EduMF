import express from 'express';
import { body } from 'express-validator';
import * as messageController from '../controllers/messageController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const createValidation = [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('body').notEmpty().withMessage('La descripción es requerida'),
  body('audience').isIn(['all', 'section', 'students']).withMessage('Audiencia inválida'),
];

router.post('/', protect, authorize('admin', 'Dirección', 'CIST', 'Auxiliar', 'Secretaría'), createValidation, messageController.createMessage);
router.get('/sent', protect, authorize('admin', 'Dirección', 'CIST', 'Auxiliar', 'Secretaría'), messageController.listSentMessages);
router.get('/:id', protect, authorize('admin', 'Dirección', 'CIST', 'Auxiliar', 'Secretaría'), messageController.getMessageById);

export default router;
