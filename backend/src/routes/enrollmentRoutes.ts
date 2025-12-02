import { Router } from 'express';
import { enrollStudent, bulkEnrollStudents, getStudentsBySection } from '../controllers/enrollmentController';
import multer from 'multer';

const router = Router();
const upload = multer();

router.post('/', enrollStudent);
router.post('/bulk', upload.single('file') as any, bulkEnrollStudents);
router.get('/section/:sectionId', getStudentsBySection);

export default router;
