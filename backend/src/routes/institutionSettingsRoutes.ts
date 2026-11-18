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
  body('horasCierreTurno')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Debe indicar al menos una hora de cierre de turno'),
  body('horasCierreTurno.*')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Cada hora de cierre debe tener el formato HH:MM'),
  body('avisarFaltaSinRegistro')
    .optional()
    .isBoolean()
    .withMessage('El aviso de falta sin registro debe ser verdadero o falso')
    .toBoolean(),
  body('umbralTardanzas')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('El umbral de tardanzas debe estar entre 0 y 50'),
  body('umbralFaltas')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('El umbral de faltas debe estar entre 0 y 50'),
  body('avisoPrivacidad')
    .optional()
    .isString()
    .isLength({ max: 4000 })
    .withMessage('El aviso de privacidad no puede superar los 4000 caracteres'),
  body('portalHabilitado')
    .optional()
    .isBoolean()
    .withMessage('El interruptor del portal debe ser verdadero o falso')
    .toBoolean(),
];

// GET /api/institution-settings/public — sin autenticación (solo branding)
router.get('/public', getPublicSettings);

// GET /api/institution-settings — protegido (admin, Dirección, CIST)
router.get('/', protect, authorize('admin', 'Dirección', 'CIST'), getSettings);

// PUT /api/institution-settings
router.put('/', protect, authorize('admin', 'Dirección', 'CIST'), updateValidations, updateSettings);

export default router;
