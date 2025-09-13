import express from 'express';
import {
  getTimeSlots,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  validateTimeSlot,
  getTimeSlotsByDay
} from '../controllers/timeSlotController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Rutas públicas para usuarios autenticados
router.route('/')
  .get(protect, getTimeSlots);

router.route('/:id')
  .get(protect, getTimeSlotById);

router.route('/day/:dayOfWeek')
  .get(protect, getTimeSlotsByDay);

// Rutas protegidas para administradores
router.route('/')
  .post(protect, authorize('admin'), validateTimeSlot, createTimeSlot);

router.route('/:id')
  .put(protect, authorize('admin'), validateTimeSlot, updateTimeSlot)
  .delete(protect, authorize('admin'), deleteTimeSlot);

export default router;