import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
  createDebt,
  listDebts,
  getDebtById,
  updateDebt,
  cancelDebt,
  reportTransfer,
  approveTransfer,
  openCashRegister,
  registerIncome,
  closeCashRegister,
  listCashRegisters,
  getCashRegisterById,
  listTransactions,
  bulkCreateDebts,
  getStats,
  getStatsByGrade,
  getStudentDebtHistory,
  getSectionDebts,
} from '../controllers/treasuryController';

const router = Router();

// Todas las rutas requieren autenticación JWT
router.use(protect);

// ─── Debts ────────────────────────────────────────────────────────────────────
router.post('/debts/bulk', authorize('admin'), bulkCreateDebts); // ANTES de /debts/:id
router.post('/debts', authorize('admin'), createDebt);
router.get('/debts', listDebts);
router.get('/debts/:id', getDebtById);
router.patch('/debts/:id', authorize('admin'), updateDebt);
router.delete('/debts/:id', authorize('admin'), cancelDebt);
router.post('/debts/:id/report-transfer', reportTransfer); // cualquier usuario autenticado

// ─── Validations ──────────────────────────────────────────────────────────────
router.post('/validations/:id/approve', authorize('admin'), approveTransfer);

// ─── CashRegisters ────────────────────────────────────────────────────────────
router.post('/cash-registers/open', authorize('admin'), openCashRegister);
router.post('/cash-registers/:id/income', authorize('admin'), registerIncome);
router.post('/cash-registers/:id/close', authorize('admin'), closeCashRegister);
router.get('/cash-registers', authorize('admin'), listCashRegisters);
router.get('/cash-registers/:id', authorize('admin'), getCashRegisterById);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', authorize('admin'), listTransactions);

// ─── Stats / Analytics ────────────────────────────────────────────────────────
router.get('/stats', authorize('admin'), getStats);
router.get('/stats/by-grade', authorize('admin'), getStatsByGrade);
router.get('/students/:studentId/history', authorize('admin'), getStudentDebtHistory);
router.get('/sections/:sectionId/debts', authorize('admin'), getSectionDebts);

export default router;
