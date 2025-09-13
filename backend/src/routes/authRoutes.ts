import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role')
    .isIn(['admin', 'teacher', 'student'])
    .withMessage('Rol inválido'),
  body('dni')
    .notEmpty()
    .withMessage('El DNI es requerido')
    .isLength({ min: 8, max: 8 })
    .withMessage('El DNI debe tener 8 dígitos')
    .isNumeric()
    .withMessage('El DNI debe contener solo números'),
];

// Validaciones para login
const loginValidation = [
  body('dni')
    .notEmpty()
    .withMessage('El DNI es requerido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
];

// Validaciones para login con QR
const loginQRValidation = [
  body('qrData')
    .notEmpty()
    .withMessage('Los datos del QR son requeridos'),
];

// Validaciones para actualizar contraseña
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

// Rutas públicas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/login-qr', loginQRValidation, authController.loginWithQR);

// Rutas protegidas
router.get('/me', protect, authController.getMe);
router.put('/update-password', protect, updatePasswordValidation, authController.updatePassword);
router.get('/generate-qr/:userId', protect, authController.generateQR);

export default router;