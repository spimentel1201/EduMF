import { Router } from 'express';
import { enrollStudent, bulkEnrollStudents } from '../controllers/enrollmentController';
import multer from 'multer';

const router = Router();
const upload = multer(); // Para manejar la subida de archivos

router.post('/', enrollStudent);
router.post('/bulk', upload.single('file'), bulkEnrollStudents);

export default router;