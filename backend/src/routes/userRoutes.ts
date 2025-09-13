import express from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/userController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Validaciones para crear/actualizar usuario
const userValidation = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
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
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Estado inválido'),
];

// Validación para crear usuario (incluye contraseña)
const createUserValidation = [
  ...userValidation,
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// Validación para cambiar contraseña
const changePasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

// Aplicar middleware de protección y autorización a todas las rutas
router.use(protect);
router.use(authorize('admin'));

// Rutas para gestión de usuarios
router.route('/')
  .get(userController.getUsers)
  .post(createUserValidation, userController.createUser);

router.route('/:id')
  .get(userController.getUserById)
  .put(userValidation, userController.updateUser)
  .delete(userController.deleteUser);

router.put('/:id/change-password', changePasswordValidation, userController.changePassword);

export default router;