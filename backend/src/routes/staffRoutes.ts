import express from 'express';
import { body } from 'express-validator';
import * as staffController from '../controllers/staffController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const staffValidation = [
  body('dni')
    .notEmpty()
    .withMessage('El DNI es requerido')
    .isLength({ min: 8, max: 8 })
    .withMessage('El DNI debe tener 8 dígitos')
    .isNumeric()
    .withMessage('El DNI debe contener solo números'),
  body('firstName')
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('lastName')
    .notEmpty()
    .withMessage('El apellido es requerido'),
  body('email')
    .isEmail()
    .withMessage('Email inválido'),
  body('role')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isIn(['Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Docente', 'Auxiliar'])
    .withMessage('Rol inválido'),
  body('level')
    .notEmpty()
    .withMessage('El nivel es requerido')
    .isIn(['Inicial', 'Primaria', 'Secundaria', 'Todos'])
    .withMessage('Nivel inválido'),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('Estado inválido'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Número de teléfono inválido'),
  body('address')
    .optional(),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('ID de usuario inválido'),
];
router.use(protect);
router.use(authorize('admin'));

// Rutas para gestión de personal
router.route('/')
  .get(staffController.getAllStaff)
  .post(staffValidation, staffController.createStaff);

router.route('/:id')
  .get(staffController.getStaffById)
  .put(staffValidation, staffController.updateStaff)
  .delete(staffController.deleteStaff);

export default router;