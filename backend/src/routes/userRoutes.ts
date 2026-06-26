import express from 'express';
import { registerUser, bulkRegisterUsers, getAllUsers } from '../controllers/userController';
import { body } from 'express-validator';
import multer from 'multer';

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
// @access  Private (Admin only) - Se añadirá middleware de autenticación y autorización
router.post('/bulk-register', upload.single('file') as any, bulkRegisterUsers); // 'file' es el nombre del campo en el formulario que contendrá el archivo

// @route   GET api/users
// @desc    Get all users
router.get('/', getAllUsers);

export default router;
