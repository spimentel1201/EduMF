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
];

// GET /api/institution-settings/public — sin autenticación (solo branding)
router.get('/public', getPublicSettings);

// GET /api/institution-settings — protegido (admin)
router.get('/', protect, authorize('admin'), getSettings);

// PUT /api/institution-settings
router.put('/', protect, authorize('admin'), updateValidations, updateSettings);

export default router;
