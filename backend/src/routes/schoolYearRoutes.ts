import express from 'express';
import { body } from 'express-validator';
import * as schoolYearController from '../controllers/schoolYearController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Validaciones para crear/actualizar año escolar
const schoolYearValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('startDate')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  body('endDate')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo', 'Finalizado'])
    .withMessage('Estado inválido'),
];

// Aplicar middleware de protección a todas las rutas
router.use(protect);

// Rutas públicas para usuarios autenticados
router.get('/current', schoolYearController.getCurrentSchoolYear);

// Rutas que requieren rol de administrador
router.route('/')
  .get(schoolYearController.getSchoolYears)
  .post(authorize('admin'), schoolYearValidation, schoolYearController.createSchoolYear);

router.route('/:id')
  .get(schoolYearController.getSchoolYearById)
  .put(authorize('admin'), schoolYearValidation, schoolYearController.updateSchoolYear)
  .delete(authorize('admin'), schoolYearController.deleteSchoolYear);

export default router;