import express from 'express';
import * as messageController from '../controllers/messageController';
import { protectGuardian } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protectGuardian, messageController.listMessages);
router.get('/:id', protectGuardian, messageController.getMessageById);
router.patch('/:id/read', protectGuardian, messageController.markAsRead);

export default router;
