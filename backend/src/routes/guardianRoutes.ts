import express from 'express';
import { body } from 'express-validator';
import * as guardianController from '../controllers/guardianController';
import { protect, protectGuardian, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const loginValidation = [
  body('loginId').notEmpty().withMessage('El identificador de acceso es requerido'),
];

const updatePasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

// Público
router.post('/login', loginValidation, guardianController.loginGuardian);

// Portal del tutor
router.get('/me', protectGuardian, guardianController.getGuardianMe);
router.get('/children/attendance', protectGuardian, guardianController.getGuardianChildrenAttendance);
router.put('/update-password', protectGuardian, updatePasswordValidation, guardianController.updateGuardianPassword);

// Admin
router.post('/import', protect, authorize('admin'), guardianController.importGuardiansEndpoint);

export default router;
