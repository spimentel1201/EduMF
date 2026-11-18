import { Router } from 'express';
import {
  enrollStudent,
  bulkEnrollStudents,
  getStudentsBySection,
  previewSiagieImport,
  commitSiagieImport,
  previewStudentReset,
  resetStudentsController,
} from '../controllers/enrollmentController';
import { protect, authorize } from '../middleware/authMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } });

/** Roles que pueden importar matrículas y reiniciar datos de estudiantes. */
const puedeImportar = authorize('admin', 'Dirección', 'CIST');

router.post('/', enrollStudent);
router.post('/bulk', upload.single('file') as any, bulkEnrollStudents);

// ── Importación del reporte SIAGIE ──────────────────────────────────────────
router.post(
  '/import/siagie/preview',
  protect,
  puedeImportar,
  upload.single('file') as any,
  previewSiagieImport
);
router.post(
  '/import/siagie/commit',
  protect,
  puedeImportar,
  upload.single('file') as any,
  commitSiagieImport
);

// ── Reinicio de estudiantes (destructivo, requiere frase de confirmación) ───
router.get('/import/reset/preview', protect, puedeImportar, previewStudentReset);
router.post('/import/reset', protect, puedeImportar, resetStudentsController);

router.get('/section/:sectionId', getStudentsBySection);

export default router;
