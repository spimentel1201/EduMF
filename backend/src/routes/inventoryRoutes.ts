import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import * as inventoryController from '../controllers/inventoryController';
import * as inventoryImportController from '../controllers/inventoryImportController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

const upload = multer({
  // Sin `storage`, multer usa memoria (req.file.buffer), igual que en matrícula.
  limits: { fileSize: 15 * 1024 * 1024 },
});

/** Roles que pueden crear / editar / importar bienes. */
const WRITE_ROLES = ['admin', 'Dirección', 'CIST', 'Auxiliar'];

const itemValidation = [
  body('nombre').trim().notEmpty().withMessage('El nombre del bien es requerido'),
  body('cantidad').optional().isNumeric().withMessage('La cantidad debe ser numérica'),
  body('valorUnitario')
    .optional()
    .isNumeric()
    .withMessage('El valor unitario debe ser numérico'),
  body('estado')
    .optional({ checkFalsy: true })
    .isIn(['B', 'R', 'N'])
    .withMessage('Estado inválido (B, R o N)'),
  body('tipoBien')
    .optional()
    .isIn(['activo_fijo', 'bien_menor'])
    .withMessage('Tipo de bien inválido'),
];

/* ── Público: información al escanear el QR (sin autenticación) ─────────── */
router.get('/public/:codigoInterno', inventoryController.getPublicItem);

/* ── A partir de aquí todo requiere autenticación ───────────────────────── */
router.use(protect);

// Lectura (incluye Docente en modo consulta)
router.get('/stats', inventoryController.getStats);
router.get('/ambientes', inventoryController.getAmbientes);
router.get('/template', inventoryImportController.downloadTemplate);
router.get('/labels', inventoryController.getLabels);
router.get('/', inventoryController.getAllItems);

// Importación masiva
router.post(
  '/import/preview',
  authorize(...WRITE_ROLES),
  upload.single('file'),
  inventoryImportController.previewImport
);
router.post(
  '/import/commit',
  authorize(...WRITE_ROLES),
  upload.single('file'),
  inventoryImportController.commitImport
);

// Ambientes
router.post(
  '/ambientes',
  authorize(...WRITE_ROLES),
  body('nombre').trim().notEmpty().withMessage('El nombre del ambiente es requerido'),
  inventoryController.createAmbiente
);

// CRUD de bienes
router.post('/', authorize(...WRITE_ROLES), itemValidation, inventoryController.createItem);

router
  .route('/:id')
  .get(inventoryController.getItemById)
  .put(authorize(...WRITE_ROLES), itemValidation, inventoryController.updateItem)
  .delete(authorize(...WRITE_ROLES), inventoryController.deleteItem);

export default router;
