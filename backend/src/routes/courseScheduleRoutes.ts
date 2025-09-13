import express from 'express';
import {
  getCourseSchedules,
  getCourseScheduleById,
  createCourseSchedule,
  updateCourseSchedule,
  deleteCourseSchedule,
  validateCourseSchedule,
  getCourseSchedulesBySection,
  getCourseSchedulesByTeacher
} from '../controllers/courseScheduleController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Rutas públicas para usuarios autenticados
router.route('/')
  .get(protect, getCourseSchedules);

router.route('/:id')
  .get(protect, getCourseScheduleById);

router.route('/section/:sectionId')
  .get(protect, getCourseSchedulesBySection);

router.route('/teacher/:teacherId')
  .get(protect, getCourseSchedulesByTeacher);

// Rutas protegidas para administradores
router.route('/')
  .post(protect, authorize('admin'), validateCourseSchedule, createCourseSchedule);

router.route('/:id')
  .put(protect, authorize('admin'), validateCourseSchedule, updateCourseSchedule)
  .delete(protect, authorize('admin'), deleteCourseSchedule);

export default router;