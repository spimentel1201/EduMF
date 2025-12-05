import express from 'express';
import {
  getAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  validateAttendance,
  bulkCreateAttendances,
  getMonthlyAttendanceReport,
  getHeatmapData,
  getSectionsComparison,
  getWeeklyTrend,
  getRecentActivity
} from '../controllers/attendanceController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router
  .route('/')
  .get(protect, getAttendances)
  .post(protect, validateAttendance, createAttendance);

router.post('/bulk', protect, bulkCreateAttendances);

router.get('/report/monthly', protect, getMonthlyAttendanceReport);
router.get('/report/heatmap', protect, getHeatmapData);
router.get('/report/comparison', protect, getSectionsComparison);

// Dashboard endpoints
router.get('/weekly-trend', protect, getWeeklyTrend);
router.get('/recent-activity', protect, getRecentActivity);

router.get('/attendance-records', protect, getAttendances);

router
  .route('/:id')
  .get(protect, getAttendanceById)
  .put(protect, validateAttendance, updateAttendance)
  .delete(protect, authorize('admin'), deleteAttendance);

export default router;