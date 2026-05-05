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
  .get(getEvents)
  .post(protect, authorize('admin', 'teacher'), createEvent);

router
  .route('/:id')
  .get(getEventById)
  .put(protect, authorize('admin', 'teacher'), updateEvent)
  .delete(protect, authorize('admin'), deleteEvent);

// --- Attendance sub-routes ---
// NOTE: /students and /summary must be defined BEFORE /:eventId/attendance
// to avoid Express matching them as the :eventId parameter.

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
  .post(protect, authorize('admin', 'teacher'), saveEventAttendance)
  .put(protect, authorize('admin', 'teacher'), updateEventAttendance);

export default router;
