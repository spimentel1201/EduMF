import { Request, Response, NextFunction } from 'express';
import { TreasuryService } from '../services/TreasuryService';
import ApiError from '../middleware/ApiError';

// ─── Debts ────────────────────────────────────────────────────────────────────

// @desc    Crear una nueva deuda
// @route   POST /api/treasury/debts
// @access  Private (admin)
export const createDebt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { studentId, concept, amount, dueDate } = req.body;

    if (!studentId || !concept || amount === undefined || amount === null || !dueDate) {
      return next(
        ApiError.badRequest('studentId, concept, amount y dueDate son requeridos')
      );
    }

    const debt = await TreasuryService.createDebt({
      studentId,
      concept,
      amount,
      dueDate,
    });

    res.status(201).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// @desc    Listar deudas con filtros y paginación
// @route   GET /api/treasury/debts
// @access  Private
export const listDebts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, studentId, search, page, limit } = req.query;

    const result = await TreasuryService.listDebts({
      status: status as string | undefined,
      studentId: studentId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// @desc    Obtener una deuda por ID
// @route   GET /api/treasury/debts/:id
// @access  Private
export const getDebtById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const debt = await TreasuryService.getDebtById(req.params.id);
    res.status(200).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// @desc    Editar concepto, monto o fecha de vencimiento de una deuda
// @route   PATCH /api/treasury/debts/:id
// @access  Private (admin)
export const updateDebt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { concept, amount, dueDate } = req.body;

    if (!concept && amount === undefined && !dueDate) {
      return next(
        ApiError.badRequest('Debes enviar al menos uno de: concept, amount, dueDate')
      );
    }

    const debt = await TreasuryService.updateDebt(req.params.id, {
      concept,
      amount,
      dueDate,
    });
    res.status(200).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// @desc    Anular una deuda (soft-delete → status ANULADO)
// @route   DELETE /api/treasury/debts/:id
// @access  Private (admin)
export const cancelDebt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const debt = await TreasuryService.cancelDebt(req.params.id);
    res.status(200).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// @desc    Reportar transferencia bancaria para una deuda
// @route   POST /api/treasury/debts/:id/report-transfer
// @access  Private (cualquier usuario autenticado)
export const reportTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { voucherUrl } = req.body;

    if (!voucherUrl) {
      return next(ApiError.badRequest('voucherUrl es requerido'));
    }

    const debt = await TreasuryService.reportTransfer(
      req.params.id,
      voucherUrl,
      req.user.id
    );

    res.status(200).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// ─── Validations ──────────────────────────────────────────────────────────────

// @desc    Aprobar transferencia bancaria
// @route   POST /api/treasury/validations/:id/approve
// @access  Private (admin)
export const approveTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const debt = await TreasuryService.approveTransfer(
      req.params.id,
      req.user.id
    );
    res.status(200).json({ success: true, data: debt });
  } catch (err) {
    next(err);
  }
};

// ─── CashRegisters ────────────────────────────────────────────────────────────

// @desc    Abrir una caja diaria
// @route   POST /api/treasury/cash-registers/open
// @access  Private (admin)
export const openCashRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { initialBalance } = req.body;

    if (initialBalance === undefined || initialBalance === null) {
      return next(ApiError.badRequest('initialBalance es requerido'));
    }

    const cashRegister = await TreasuryService.openCashRegister({
      initialBalance,
      userId: req.user.id,
    });

    res.status(201).json({ success: true, data: cashRegister });
  } catch (err) {
    next(err);
  }
};

// @desc    Registrar ingreso en caja
// @route   POST /api/treasury/cash-registers/:id/income
// @access  Private (admin)
export const registerIncome = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { debtId, amount } = req.body;

    if (!debtId || amount === undefined || amount === null) {
      return next(ApiError.badRequest('debtId y amount son requeridos'));
    }

    const result = await TreasuryService.registerIncome({
      cashRegisterId: req.params.id,
      debtId,
      amount,
      userId: req.user.id,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Cerrar una caja diaria
// @route   POST /api/treasury/cash-registers/:id/close
// @access  Private (admin)
export const closeCashRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { realBalance } = req.body;

    if (realBalance === undefined || realBalance === null) {
      return next(ApiError.badRequest('realBalance es requerido'));
    }

    const cashRegister = await TreasuryService.closeCashRegister({
      cashRegisterId: req.params.id,
      realBalance,
      userId: req.user.id,
    });

    res.status(200).json({ success: true, data: cashRegister });
  } catch (err) {
    next(err);
  }
};

// @desc    Listar cajas con paginación
// @route   GET /api/treasury/cash-registers
// @access  Private (admin)
export const listCashRegisters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = req.query;

    const result = await TreasuryService.listCashRegisters({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// @desc    Obtener una caja por ID con sus transacciones
// @route   GET /api/treasury/cash-registers/:id
// @access  Private (admin)
export const getCashRegisterById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await TreasuryService.getCashRegisterById(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Transactions ─────────────────────────────────────────────────────────────

// @desc    Listar transacciones con filtro opcional por caja
// @route   GET /api/treasury/transactions
// @access  Private (admin)
export const listTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cashRegisterId } = req.query;

    const transactions = await TreasuryService.listTransactions({
      cashRegisterId: cashRegisterId as string | undefined,
    });

    res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// @desc    Crear deudas masivas para todos los estudiantes activos (o por grado/sección)
// @route   POST /api/treasury/debts/bulk
// @access  Private (admin)
export const bulkCreateDebts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { concept, amount, dueDate, grade, section, frecuencia } = req.body;

    if (!concept || amount === undefined || amount === null || !dueDate) {
      return next(ApiError.badRequest('concept, amount y dueDate son requeridos'));
    }

    const result = await TreasuryService.bulkCreateDebts({
      concept,
      amount,
      dueDate,
      frecuencia: frecuencia as string | undefined,
      grade: grade as string | undefined,
      section: section as string | undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Se generaron ${result.created} cobros exitosamente.${
        result.errors.length > 0 ? ` ${result.errors.length} errores.` : ''
      }`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    KPIs globales de tesorería
// @route   GET /api/treasury/stats
// @access  Private (admin)
export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await TreasuryService.getStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// @desc    Deuda total agrupada por grado/sección
// @route   GET /api/treasury/stats/by-grade
// @access  Private (admin)
export const getStatsByGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await TreasuryService.getStatsByGrade();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// @desc    Historial de deudas de un estudiante
// @route   GET /api/treasury/students/:studentId/history
// @access  Private (admin)
export const getStudentDebtHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await TreasuryService.getStudentDebtHistory(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Lista alumnos de una sección con sus deudas activas
// @route   GET /api/treasury/sections/:sectionId/debts
// @access  Private (admin)
export const getSectionDebts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await TreasuryService.getSectionDebts(req.params.sectionId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
