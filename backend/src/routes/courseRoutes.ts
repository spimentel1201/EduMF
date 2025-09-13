import express from 'express';
import { body } from 'express-validator';
import * as courseController from '../controllers/courseController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Validaciones para crear/actualizar curso
const courseValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('description')
    .optional(),
  body('level')
    .notEmpty()
    .withMessage('El nivel es requerido')
    .isIn(['Inicial', 'Primaria', 'Secundaria', 'Todos'])
    .withMessage('Nivel inválido'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Estado inválido'),
];

// Aplicar middleware de protección a todas las rutas
router.use(protect);

// Rutas públicas para usuarios autenticados
router.get('/level/:level', courseController.getCoursesByLevel);

// Rutas que requieren rol de administrador para crear, actualizar y eliminar
router.route('/')
  .get(courseController.getCourses)
  .post(authorize('admin'), courseValidation, courseController.createCourse);

router.route('/:id')
  .get(courseController.getCourseById)
  .put(authorize('admin'), courseValidation, courseController.updateCourse)
  .delete(authorize('admin'), courseController.deleteCourse);

export default router;