import { Router } from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/authMiddleware';
import { getSettings, getPublicSettings, updateSettings } from '../controllers/institutionSettingsController';

const router = Router();

// Validaciones para PUT
const updateValidations = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la institución es requerido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('El correo electrónico no tiene un formato válido'),
  body('horaIngreso')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de ingreso debe tener el formato HH:MM'),
  body('horaSalida')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de salida debe tener el formato HH:MM'),
  body('toleranciaMinutos')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('La tolerancia debe estar entre 0 y 120 minutos'),
];

// GET /api/institution-settings/public — sin autenticación (solo branding)
router.get('/public', getPublicSettings);

// GET /api/institution-settings — protegido (admin, Dirección, CIST)
router.get('/', protect, authorize('admin', 'Dirección', 'CIST'), getSettings);

// PUT /api/institution-settings
router.put('/', protect, authorize('admin', 'Dirección', 'CIST'), updateValidations, updateSettings);

export default router;
