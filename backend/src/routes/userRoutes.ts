import express from 'express';
import {
  registerUser,
  bulkRegisterUsers,
  getAllUsers,
  updateUserStatus,
} from '../controllers/userController';
import { body } from 'express-validator';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

import os from 'os';

// Configuración de Multer para la subida de archivos (usando /tmp para compatibilidad con Vercel)
const upload = multer({ dest: os.tmpdir() });

// @route   POST api/users/register
// @desc    Register a new user (student by default)
// @access  Public
router.post(
  '/register',
  [
    body('firstName', 'El nombre es requerido').not().isEmpty(),
    body('lastName', 'El apellido es requerido').not().isEmpty(),
    body('dni', 'El DNI es requerido').not().isEmpty(),
    body('dni', 'El DNI debe tener 8 dígitos').isLength({ min: 8, max: 8 }),
    body('email', 'Por favor, incluya un email válido').optional({ checkFalsy: true }).isEmail(),
    body('password', 'La contraseña debe tener 6 o más caracteres').optional({ checkFalsy: true }).isLength({ min: 6 }),
    body('gender', 'El género es requerido').optional({ checkFalsy: true }).not().isEmpty(),
    body('birthdate', 'La fecha de nacimiento es requerida').optional().not().isEmpty(),
  ],
  registerUser
);

// @route   POST api/users/bulk-register
// @desc    Bulk register users from CSV/Excel
// @access  Private (Admin only)
router.post('/bulk-register', upload.single('file') as any, bulkRegisterUsers);

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', protect, getAllUsers);

// @route   PATCH api/users/:id/status
// @desc    Activar o dar de baja (desactivar) un usuario
// @access  Private (Admin, Dirección, CIST)
router.patch('/:id/status', protect, authorize('admin', 'Dirección', 'CIST'), updateUserStatus);

export default router;
