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
import { registerQRAttendance } from '../controllers/qrAttendanceController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/qr-scan', registerQRAttendance);

router
  .route('/')
  .get(protect, getAttendances)
  .post(protect, validateAttendance, createAttendance);

router.post('/bulk', protect, bulkCreateAttendances);

router.get('/report/monthly', protect, getMonthlyAttendanceReport);
router.get('/report/heatmap', protect, getHeatmapData);
router.get('/report/comparison', protect, getSectionsComparison);

router.get('/weekly-trend', protect, getWeeklyTrend);
router.get('/recent-activity', protect, getRecentActivity);

router.get('/attendance-records', protect, getAttendances);

router
  .route('/:id')
  .get(protect, getAttendanceById)
  .put(protect, validateAttendance, updateAttendance)
  .delete(protect, authorize('admin', 'Dirección', 'CIST', 'Auxiliar'), deleteAttendance);

export default router;