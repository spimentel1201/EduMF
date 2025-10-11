import express from 'express';
import { body } from 'express-validator';
import * as sectionController from '../controllers/sectionController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const sectionValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('grade')
    .notEmpty()
    .withMessage('El grado es requerido')
    .isInt({ min: 1, max: 6 })
    .withMessage('El grado debe ser un número entre 1 y 6'),
  body('level')
    .notEmpty()
    .withMessage('El nivel es requerido')
    .isIn(['Inicial', 'Primaria', 'Secundaria'])
    .withMessage('Nivel inválido'),
  body('section')
    .notEmpty()
    .withMessage('La sección es requerida')
    .isLength({ min: 1, max: 1 })
    .withMessage('La sección debe ser una letra')
    .isAlpha()
    .withMessage('La sección debe ser una letra'),
  body('maxStudents')
    .notEmpty()
    .withMessage('El número máximo de estudiantes es requerido')
    .isInt({ min: 1, max: 50 })
    .withMessage('Debe haber entre 1 y 50 estudiantes'),
  body('schoolYearId')
    .notEmpty()
    .withMessage('El año escolar es requerido')
    .isMongoId()
    .withMessage('ID de año escolar inválido'),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('Estado inválido'),
];

router.use(protect);

// Rutas públicas para usuarios autenticados
router.get('/school-year/:schoolYearId', sectionController.getSectionsBySchoolYear);

// Rutas que requieren rol de administrador
router.route('/')
  .get(sectionController.getSections)
  .post(authorize('admin'), sectionValidation, sectionController.createSection);

router.route('/:id')
  .get(sectionController.getSectionById)
  .put(authorize('admin'), sectionValidation, sectionController.updateSection)
  .delete(authorize('admin'), sectionController.deleteSection);

export default router;