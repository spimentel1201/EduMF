import express from 'express';
import { body } from 'express-validator';
import * as incidentController from '../controllers/incidentController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const incidentValidation = [
    body('incidentType')
        .notEmpty()
        .withMessage('El tipo de incidencia es requerido')
        .isIn(['Conductual', 'Académica', 'Salud', 'Bullying', 'Daño a propiedad', 'Otro'])
        .withMessage('Tipo de incidencia inválido'),
    body('incidentDate')
        .notEmpty()
        .withMessage('La fecha del incidente es requerida')
        .isISO8601()
        .withMessage('Formato de fecha inválido'),
    body('reporterName')
        .notEmpty()
        .withMessage('El nombre del informante es requerido'),
    body('description')
        .notEmpty()
        .withMessage('La descripción del incidente es requerida'),
    body('location')
        .notEmpty()
        .withMessage('El lugar del incidente es requerido'),
    body('victimId')
        .optional()
        .isMongoId()
        .withMessage('ID de víctima inválido'),
    body('aggressorId')
        .optional()
        .isMongoId()
        .withMessage('ID de agresor inválido'),
    body('isViolent')
        .optional()
        .isBoolean()
        .withMessage('El campo isViolent debe ser booleano'),
    body('actionsTaken')
        .optional(),
    body('status')
        .optional()
        .isIn(['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'])
        .withMessage('Estado inválido'),
];

// Proteger todas las rutas
router.use(protect);
router.use(authorize('admin', 'teacher'));

// Ruta de estadísticas (debe ir antes de /:id para evitar conflictos)
router.get('/stats', incidentController.getIncidentStats);

// Rutas CRUD para incidencias
router.route('/')
    .get(incidentController.getAllIncidents)
    .post(incidentValidation, incidentController.createIncident);

router.route('/:id')
    .get(incidentController.getIncidentById)
    .put(incidentValidation, incidentController.updateIncident)
    .delete(incidentController.deleteIncident);

// Ruta para cambiar estado de incidencia
router.patch('/:id/status', incidentController.updateIncidentStatus);

export default router;
