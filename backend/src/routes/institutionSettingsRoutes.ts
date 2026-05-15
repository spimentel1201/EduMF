import { Router } from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/authMiddleware';
import { getSettings, updateSettings } from '../controllers/institutionSettingsController';

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

// GET /api/institution-settings
router.get('/', protect, authorize('admin'), getSettings);

// PUT /api/institution-settings
router.put('/', protect, authorize('admin'), updateValidations, updateSettings);

export default router;
