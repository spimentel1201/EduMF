import express from 'express';
import {
  getAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  validateAttendance
} from '../controllers/attendanceController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router
  .route('/')
  .get(protect, getAttendances)
  .post(protect, validateAttendance, createAttendance);

router
  .route('/:id')
  .get(protect, getAttendanceById)
  .put(protect, validateAttendance, updateAttendance)
  .delete(protect, authorize('admin'), deleteAttendance);

export default router;