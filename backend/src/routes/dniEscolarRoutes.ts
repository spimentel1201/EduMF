import express from 'express';
import { body } from 'express-validator';
import * as dniEscolarController from '../controllers/dniEscolarController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren sesión iniciada (igual que el resto de módulos).
router.use(protect);

/** Roles que pueden crear / editar / generar / cargar fotos. */
const WRITE_ROLES = ['admin', 'Dirección', 'CIST', 'Auxiliar'];

const dniValidation = [
  body('cui')
    .trim()
    .notEmpty()
    .withMessage('El CUI es requerido')
    .matches(/^[0-9A-Za-z]{6,15}$/)
    .withMessage('El CUI debe tener entre 6 y 15 caracteres alfanuméricos'),
  body('primerApellido')
    .trim()
    .notEmpty()
    .withMessage('El primer apellido es requerido'),
  body('preNombres')
    .trim()
    .notEmpty()
    .withMessage('Los pre-nombres son requeridos'),
  body('sexo')
    .optional()
    .isIn(['M', 'F'])
    .withMessage('Sexo inválido (M o F)'),
  body('donacionOrganos')
    .optional()
    .isIn(['Si', 'No'])
    .withMessage('Donación de órganos inválida (Si o No)'),
];

// Lectura (incluye Docente en modo consulta)
router.get('/stats', dniEscolarController.getStats);
router.get('/print', dniEscolarController.getPrintData);
router.get('/', dniEscolarController.getAllDnis);

// Escritura
router.post(
  '/generar',
  authorize(...WRITE_ROLES),
  body('sectionId').notEmpty().withMessage('La sección es requerida'),
  dniEscolarController.generarDesdeMatricula
);

router.post(
  '/fotos',
  authorize(...WRITE_ROLES),
  body('fotos').isArray({ min: 1 }).withMessage('No se enviaron fotos'),
  dniEscolarController.subirFotos
);

router.post('/', authorize(...WRITE_ROLES), dniValidation, dniEscolarController.createDni);

router
  .route('/:id')
  .get(dniEscolarController.getDniById)
  .put(authorize(...WRITE_ROLES), dniValidation, dniEscolarController.updateDni)
  .delete(authorize(...WRITE_ROLES), dniEscolarController.deleteDni);

export default router;
