import express from 'express';
import {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getStudentsForEvent,
  getEventAttendanceSummary,
  getEventAttendance,
  saveEventAttendance,
  updateEventAttendance,
} from '../controllers/eventController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// --- Event CRUD routes ---

router
  .route('/')
  .get(protect, getEvents)
  .post(protect, authorize('admin', 'Dirección', 'CIST', 'Psicólogo(a)'), createEvent);

router
  .route('/:id')
  .get(protect, getEventById)
  .put(protect, authorize('admin', 'Dirección', 'CIST', 'Psicólogo(a)'), updateEvent)
  .delete(protect, authorize('admin', 'Dirección', 'CIST', 'Psicólogo(a)'), deleteEvent);

router.get(
  '/:eventId/attendance/students',
  protect,
  getStudentsForEvent
);

router.get(
  '/:eventId/attendance/summary',
  protect,
  getEventAttendanceSummary
);

router
  .route('/:eventId/attendance')
  .get(protect, getEventAttendance)
  .post(protect, authorize('admin', 'teacher', 'Dirección', 'CIST', 'Psicólogo(a)', 'Docente'), saveEventAttendance)
  .put(protect, authorize('admin', 'teacher', 'Dirección', 'CIST', 'Psicólogo(a)', 'Docente'), updateEventAttendance);

export default router;
