import mongoose from 'mongoose';
import Debt, { IDebt } from '../models/Debt';
import CashRegister, { ICashRegister } from '../models/CashRegister';
import Transaction, { ITransaction } from '../models/Transaction';
import Enrollment from '../models/Enrollment';
import Section from '../models/Section';
import SchoolYear from '../models/SchoolYear';
import {
  DebtNotFoundError,
  InvalidPaymentStateError,
  CashRegisterNotOpenError,
  CashRegisterAlreadyOpenError,
} from '../middleware/treasuryErrors';
import ApiError from '../middleware/ApiError';

// ─── Helpers de Decimal128 ────────────────────────────────────────────────────

const SCALE = 100_000_000n; // 8 decimales de precisión

/**
 * Convierte un string o number a Decimal128.
 * Lanza ApiError 400 si el valor no es numérico válido.
 */
export function toDecimal128(
  value: string | number,
  fieldName = 'amount'
): mongoose.Types.Decimal128 {
  const str = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw ApiError.badRequest(
      `El campo '${fieldName}' debe ser un valor numérico válido (recibido: '${str}')`
    );
  }
  return mongoose.Types.Decimal128.fromString(str);
}

function toBigInt(d: mongoose.Types.Decimal128): bigint {
  const parts = d.toString().split('.');
  const intPart = BigInt(parts[0]);
  const fracStr = parts[1] ?? '';
  const fracPart = BigInt(fracStr.padEnd(8, '0').slice(0, 8));
  return intPart * SCALE + fracPart;
}

function fromBigInt(n: bigint): mongoose.Types.Decimal128 {
  const intPart = n / SCALE;
  const fracPart = (n % SCALE).toString().padStart(8, '0').replace(/0+$/, '') || '0';
  return mongoose.Types.Decimal128.fromString(`${intPart}.${fracPart}`);
}

/**
 * Suma un array de Decimal128 usando aritmética BigInt para evitar float.
 */
export function sumDecimal128(
  values: mongoose.Types.Decimal128[]
): mongoose.Types.Decimal128 {
  if (values.length === 0) {
    return mongoose.Types.Decimal128.fromString('0.0');
  }
  const total = values.reduce((acc, d) => acc + toBigInt(d), 0n);
  return fromBigInt(total);
}

/**
 * Resta b de a usando aritmética BigInt.
 */
export function subtractDecimal128(
  a: mongoose.Types.Decimal128,
  b: mongoose.Types.Decimal128
): mongoose.Types.Decimal128 {
  const result = toBigInt(a) - toBigInt(b);
  return fromBigInt(result < 0n ? 0n : result);
}

// ─── TreasuryService ──────────────────────────────────────────────────────────

export const TreasuryService = {

  // ── Debts ──────────────────────────────────────────────────────────────────

  async createDebt(data: {
    studentId: string;
    concept: string;
    amount: string | number;
    dueDate: string;
  }): Promise<IDebt> {
    const { studentId, concept, amount, dueDate } = data;

    if (!studentId || !concept || amount === undefined || amount === null || !dueDate) {
      throw ApiError.badRequest(
        'Los campos studentId, concept, amount y dueDate son requeridos'
      );
    }

    const debt = await Debt.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      concept,
      amount: toDecimal128(amount),
      dueDate: new Date(dueDate),
    });

    return debt;
  },

  async listDebts(query: {
    status?: string;
    studentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};

    if (query.status) filter.status = query.status;
    if (query.studentId) {
      filter.studentId = new mongoose.Types.ObjectId(query.studentId);
    }
    if (query.search) {
      const User = (await import('../models/User')).default;
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: query.search, $options: 'i' } },
          { lastName: { $regex: query.search, $options: 'i' } },
          { dni: { $regex: query.search, $options: 'i' } }
        ]
      }).select('_id').lean();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { concept: { $regex: query.search, $options: 'i' } },
        { studentId: { $in: userIds } }
      ];
    }

    const [debts, total] = await Promise.all([
      Debt.find(filter)
        .populate('studentId', 'firstName lastName dni')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Debt.countDocuments(filter),
    ]);

    // Enriquecer con grado/sección del alumno desde matrículas activas
    const activeYear = await SchoolYear.findOne({ status: 'Activo' }).lean();

    // Obtener matrículas para los studentIds de esta página
    const studentIds = debts.map((d) => d.studentId);
    let enrollmentMap = new Map<string, { grade: number; section: string }>();

    if (activeYear && studentIds.length > 0) {
      const enrollments = await Enrollment.find({
        studentId: { $in: studentIds },
        schoolYearId: activeYear._id,
        status: 'active',
      })
        .populate('sectionId', 'grade section')
        .lean();

      for (const e of enrollments) {
        const sid = (e.studentId as any).toString();
        const sec = e.sectionId as any;
        if (sec && !enrollmentMap.has(sid)) {
          enrollmentMap.set(sid, { grade: sec.grade, section: sec.section });
        }
      }
    }

    // Serializar con datos del alumno
    const data = debts.map((debt) => {
      const obj = debt.toJSON() as any;
      const student = debt.studentId as any;
      const sid = student?._id?.toString() ?? obj.studentId;
      const enrollment = enrollmentMap.get(sid);

      obj.studentName = student?.firstName
        ? `${student.lastName}, ${student.firstName}`
        : null;
      obj.studentDni = student?.dni ?? null;
      obj.studentGrade = enrollment?.grade ?? null;
      obj.studentSection = enrollment?.section ?? null;
      // Mantener studentId como string para compatibilidad
      obj.studentId = sid;

      return obj;
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getDebtById(id: string): Promise<IDebt> {
    const debt = await Debt.findById(id);
    if (!debt) throw new DebtNotFoundError(id);
    return debt;
  },

  async reportTransfer(
    debtId: string,
    voucherUrl: string,
    userId: string
  ): Promise<IDebt> {
    const debt = await Debt.findById(debtId);
    if (!debt) throw new DebtNotFoundError(debtId);

    // Idempotencia: ya en EN_VALIDACION con el mismo voucher
    if (debt.status === 'EN_VALIDACION' && debt.voucherUrl === voucherUrl) {
      return debt;
    }

    if (debt.status !== 'PENDIENTE' && debt.status !== 'VENCIDO') {
      throw new InvalidPaymentStateError(debt.status, 'PENDIENTE o VENCIDO');
    }

    debt.status = 'EN_VALIDACION';
    debt.voucherUrl = voucherUrl;
    await debt.save();

    await Transaction.create({
      debtId: debt._id,
      type: 'INGRESO',
      paymentMethod: 'TRANSFERENCIA',
      amount: debt.amount,
      voucherUrl,
      registeredByUserId: new mongoose.Types.ObjectId(userId),
    });

    return debt;
  },

  async approveTransfer(debtId: string, adminUserId: string): Promise<IDebt> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const debt = await Debt.findById(debtId).session(session);
      if (!debt) throw new DebtNotFoundError(debtId);

      if (debt.status !== 'EN_VALIDACION') {
        throw new InvalidPaymentStateError(debt.status, 'EN_VALIDACION');
      }

      debt.status = 'PAGADO';
      await debt.save({ session });

      await Transaction.create(
        [
          {
            debtId: debt._id,
            type: 'INGRESO',
            paymentMethod: 'TRANSFERENCIA',
            amount: debt.amount,
            voucherUrl: debt.voucherUrl,
            registeredByUserId: new mongoose.Types.ObjectId(adminUserId),
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return debt;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // ── CashRegisters ──────────────────────────────────────────────────────────

  async openCashRegister(data: {
    initialBalance: string | number;
    userId: string;
  }): Promise<ICashRegister> {
    const { initialBalance, userId } = data;

    const existing = await CashRegister.findOne({
      openedByUserId: new mongoose.Types.ObjectId(userId),
      status: 'ABIERTA',
    });
    if (existing) throw new CashRegisterAlreadyOpenError();

    const balance = toDecimal128(initialBalance, 'initialBalance');

    const cashRegister = await CashRegister.create({
      openedByUserId: new mongoose.Types.ObjectId(userId),
      openedAt: new Date(),
      initialBalance: balance,
      expectedBalance: balance,
    });

    return cashRegister;
  },

  async registerIncome(data: {
    cashRegisterId: string;
    debtId: string;
    amount: string | number;
    userId: string;
  }): Promise<{ cashRegister: ICashRegister; transaction: ITransaction }> {
    const { cashRegisterId, debtId, amount, userId } = data;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const cashRegister = await CashRegister.findById(cashRegisterId).session(session);
      if (!cashRegister || cashRegister.status !== 'ABIERTA') {
        throw new CashRegisterNotOpenError(cashRegisterId);
      }

      const debt = await Debt.findById(debtId).session(session);
      if (!debt) throw new DebtNotFoundError(debtId);

      const amountD128 = toDecimal128(amount);

      debt.status = 'PAGADO';
      await debt.save({ session });

      const [transaction] = await Transaction.create(
        [
          {
            cashRegisterId: cashRegister._id,
            debtId: debt._id,
            type: 'INGRESO',
            paymentMethod: 'EFECTIVO',
            amount: amountD128,
            registeredByUserId: new mongoose.Types.ObjectId(userId),
          },
        ],
        { session }
      );

      cashRegister.expectedBalance = sumDecimal128([
        cashRegister.expectedBalance,
        amountD128,
      ]);
      await cashRegister.save({ session });

      await session.commitTransaction();
      return { cashRegister, transaction };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async closeCashRegister(data: {
    cashRegisterId: string;
    realBalance: string | number;
    userId: string;
  }): Promise<ICashRegister> {
    const { cashRegisterId, realBalance, userId } = data;

    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      throw ApiError.notFound(`Caja '${cashRegisterId}' no encontrada`);
    }
    if (cashRegister.status !== 'ABIERTA') {
      throw new CashRegisterNotOpenError(cashRegisterId);
    }

    const ingresos = await Transaction.find({
      cashRegisterId: cashRegister._id,
      type: 'INGRESO',
    });
    const egresos = await Transaction.find({
      cashRegisterId: cashRegister._id,
      type: 'EGRESO',
    });

    const totalIngresos = sumDecimal128(ingresos.map((t) => t.amount));
    const totalEgresos = sumDecimal128(egresos.map((t) => t.amount));
    const expectedBalance = subtractDecimal128(
      sumDecimal128([cashRegister.initialBalance, totalIngresos]),
      totalEgresos
    );

    cashRegister.expectedBalance = expectedBalance;
    cashRegister.realBalance = toDecimal128(realBalance, 'realBalance');
    cashRegister.closedAt = new Date();
    cashRegister.closedByUserId = new mongoose.Types.ObjectId(userId);
    cashRegister.status = 'CERRADA';
    await cashRegister.save();

    return cashRegister;
  },

  async listCashRegisters(query: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: ICashRegister[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      CashRegister.find().sort({ openedAt: -1 }).skip(skip).limit(limit),
      CashRegister.countDocuments(),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getCashRegisterById(
    id: string
  ): Promise<{ cashRegister: ICashRegister; transactions: ITransaction[] }> {
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister) {
      throw ApiError.notFound(`Caja '${id}' no encontrada`);
    }

    const transactions = await Transaction.find({
      cashRegisterId: cashRegister._id,
    }).sort({ createdAt: -1 });

    return { cashRegister, transactions };
  },

  async listTransactions(query: {
    cashRegisterId?: string;
  }): Promise<ITransaction[]> {
    const filter: Record<string, any> = {};
    if (query.cashRegisterId) {
      filter.cashRegisterId = new mongoose.Types.ObjectId(query.cashRegisterId);
    }
    return Transaction.find(filter).sort({ createdAt: -1 });
  },

  // ── Update / Cancel Debt ───────────────────────────────────────────────────

  /**
   * Edita concept, amount y/o dueDate de una deuda.
   * Solo permitido si status es PENDIENTE o VENCIDO.
   */
  async updateDebt(
    id: string,
    data: { concept?: string; amount?: string | number; dueDate?: string }
  ): Promise<IDebt> {
    const debt = await Debt.findById(id);
    if (!debt) throw new DebtNotFoundError(id);

    if (debt.status !== 'PENDIENTE' && debt.status !== 'VENCIDO') {
      throw new InvalidPaymentStateError(
        debt.status,
        'PENDIENTE o VENCIDO'
      );
    }

    if (data.concept !== undefined) debt.concept = data.concept;
    if (data.amount !== undefined) debt.amount = toDecimal128(data.amount);
    if (data.dueDate !== undefined) debt.dueDate = new Date(data.dueDate);

    await debt.save();
    return debt;
  },

  /**
   * Anula una deuda (soft-delete). Solo permitido si status es PENDIENTE o VENCIDO.
   */
  async cancelDebt(id: string): Promise<IDebt> {
    const debt = await Debt.findById(id);
    if (!debt) throw new DebtNotFoundError(id);

    if (debt.status === 'PAGADO') {
      throw new InvalidPaymentStateError(debt.status, 'PENDIENTE o VENCIDO');
    }
    if (debt.status === 'ANULADO') {
      return debt; // idempotente
    }

    debt.status = 'ANULADO';
    await debt.save();
    return debt;
  },

  // ── Bulk Debts ─────────────────────────────────────────────────────────────

  async bulkCreateDebts(data: {
    concept: string;
    amount: string | number;
    dueDate: string;
    frecuencia?: string;
    grade?: string;
    section?: string;
  }): Promise<{ created: number; errors: string[] }> {
    const { concept, amount, dueDate, frecuencia = 'Un solo pago', grade, section } = data;

    if (!concept || amount === undefined || amount === null || !dueDate) {
      throw ApiError.badRequest('concept, amount y dueDate son requeridos');
    }

    // ── Helpers de días laborables ──────────────────────────────────────────
    const isWorkday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

    /** Devuelve todos los días laborables de la semana que contiene `date` (Lun-Vie) */
    const workdaysOfWeek = (date: Date): Date[] => {
      const d = new Date(date);
      // Retroceder al lunes de esa semana
      const day = d.getDay(); // 0=Dom, 1=Lun...6=Sáb
      const diffToMonday = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diffToMonday);
      const days: Date[] = [];
      for (let i = 0; i < 5; i++) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      return days;
    };

    /** Devuelve todos los días laborables del mes desde `startDate` hasta fin de mes */
    const workdaysOfMonth = (startDate: Date): Date[] => {
      const days: Date[] = [];
      const d = new Date(startDate);
      const month = d.getMonth();
      while (d.getMonth() === month) {
        if (isWorkday(d)) days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      return days;
    };

    /** Avanza al siguiente día laborable si cae en fin de semana */
    const nextWorkday = (date: Date): Date => {
      const d = new Date(date);
      while (!isWorkday(d)) d.setDate(d.getDate() + 1);
      return d;
    };

    // ── Calcular fechas de vencimiento según frecuencia ─────────────────────
    const startDate = nextWorkday(new Date(dueDate));
    let dueDates: Date[];

    switch (frecuencia) {
      case 'Semanal':
        // 5 deudas: una por cada día laborable (Lun-Vie) de la semana de startDate
        dueDates = workdaysOfWeek(startDate);
        break;
      case 'Mensual':
        // Una deuda por cada día laborable del mes desde startDate hasta fin de mes
        dueDates = workdaysOfMonth(startDate);
        break;
      case 'Diario':
        // 1 deuda para el siguiente día laborable
        dueDates = [startDate];
        break;
      default:
        // Un solo pago
        dueDates = [startDate];
    }

    // 1. Obtener el año escolar activo
    const activeYear = await SchoolYear.findOne({ status: 'Activo' });
    if (!activeYear) {
      throw ApiError.badRequest('No existe un año escolar activo. Activa uno antes de generar cobros.');
    }

    // 2. Construir filtro de matrículas
    const enrollmentFilter: Record<string, any> = {
      schoolYearId: activeYear._id,
      status: 'active',
    };

    if (grade || section) {
      const sectionFilter: Record<string, any> = { schoolYearId: activeYear._id };
      if (grade) sectionFilter.grade = Number(grade);
      if (section) sectionFilter.section = section.toUpperCase();

      const sections = await Section.find(sectionFilter).select('_id');
      if (sections.length === 0) {
        throw ApiError.badRequest(
          `No se encontraron secciones para grado=${grade ?? '*'} seccion=${section ?? '*'} en el año escolar activo.`
        );
      }
      enrollmentFilter.sectionId = { $in: sections.map((s) => s._id) };
    }

    // 3. Obtener studentIds
    const enrollments = await Enrollment.find(enrollmentFilter).select('studentId').lean();
    if (enrollments.length === 0) {
      throw ApiError.badRequest('No se encontraron estudiantes matriculados con los filtros indicados.');
    }

    const amountD128 = toDecimal128(amount);
    const errors: string[] = [];
    let created = 0;

    // 4. Crear una deuda por cada (estudiante × fecha de vencimiento)
    const docs = enrollments.flatMap((e) =>
      dueDates.map((dd) => ({
        studentId: e.studentId,
        concept,
        amount: amountD128,
        dueDate: dd,
        status: 'PENDIENTE' as const,
      }))
    );

    try {
      await Debt.insertMany(docs, { ordered: false });
      created = docs.length;
    } catch (err: any) {
      if (err.writeErrors) {
        created = docs.length - err.writeErrors.length;
        for (const we of err.writeErrors) {
          errors.push(`Indice ${we.index}: ${we.errmsg}`);
        }
      } else {
        throw err;
      }
    }

    return { created, errors };
  },

  // ── Analytics / Stats ──────────────────────────────────────────────────────

  /**
   * KPIs globales de tesorería.
   */
  async getStats(): Promise<{
    totalCollected: string;
    totalPending: string;
    totalOverdue: string;
    countPending: number;
    countOverdue: number;
    countPaid: number;
    countCancelled: number;
    countInValidation: number;
  }> {
    const [paid, pending, overdue, inValidation, cancelled] = await Promise.all([
      Debt.find({ status: 'PAGADO' }).select('amount').lean(),
      Debt.find({ status: 'PENDIENTE' }).select('amount').lean(),
      Debt.find({ status: 'VENCIDO' }).select('amount').lean(),
      Debt.find({ status: 'EN_VALIDACION' }).select('amount').lean(),
      Debt.find({ status: 'ANULADO' }).select('amount').lean(),
    ]);

    const sumStr = (docs: { amount: mongoose.Types.Decimal128 }[]) =>
      sumDecimal128(docs.map((d) => d.amount)).toString();

    return {
      totalCollected:   sumStr(paid as any),
      totalPending:     sumStr([...(pending as any), ...(overdue as any)]),
      totalOverdue:     sumStr(overdue as any),
      countPending:     pending.length,
      countOverdue:     overdue.length,
      countPaid:        paid.length,
      countCancelled:   cancelled.length,
      countInValidation: inValidation.length,
    };
  },

  /**
   * Deuda total agrupada por grado y sección (solo deudas activas: PENDIENTE + VENCIDO).
   */
  async getStatsByGrade(): Promise<
    Array<{
      grade: number;
      section: string;
      sectionId: string;
      totalDebt: string;
      countPending: number;
      countOverdue: number;
      studentCount: number;
    }>
  > {
    const activeYear = await SchoolYear.findOne({ status: 'Activo' }).lean();
    if (!activeYear) return [];

    const sections = await Section.find({ schoolYearId: activeYear._id }).lean();

    const results = await Promise.all(
      sections.map(async (sec) => {
        const enrollments = await Enrollment.find({
          sectionId: sec._id,
          schoolYearId: activeYear._id,
          status: 'active',
        })
          .select('studentId')
          .lean();

        const studentIds = enrollments.map((e) => e.studentId);

        const [pendingDebts, overdueDebts] = await Promise.all([
          Debt.find({ studentId: { $in: studentIds }, status: 'PENDIENTE' }).select('amount').lean(),
          Debt.find({ studentId: { $in: studentIds }, status: 'VENCIDO' }).select('amount').lean(),
        ]);

        const allDebts = [...pendingDebts, ...overdueDebts] as { amount: mongoose.Types.Decimal128 }[];
        const totalDebt = allDebts.length > 0
          ? sumDecimal128(allDebts.map((d) => d.amount)).toString()
          : '0.00';

        return {
          grade:        sec.grade,
          section:      sec.section,
          sectionId:    sec._id.toString(),
          totalDebt,
          countPending: pendingDebts.length,
          countOverdue: overdueDebts.length,
          studentCount: studentIds.length,
        };
      })
    );

    return results.sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
  },

  /**
   * Historial de deudas de un estudiante específico, con datos del alumno.
   */
  async getStudentDebtHistory(studentId: string): Promise<{
    student: { id: string; firstName: string; lastName: string; dni: string } | null;
    debts: IDebt[];
    totalDebt: string;
    totalPaid: string;
  }> {
    const User = (await import('../models/User')).default;
    const student = await User.findById(studentId).select('firstName lastName dni').lean();

    const debts = await Debt.find({ studentId: new mongoose.Types.ObjectId(studentId) })
      .sort({ createdAt: -1 })
      .lean() as unknown as IDebt[];

    const activeDebts = debts.filter(
      (d) => d.status === 'PENDIENTE' || d.status === 'VENCIDO'
    ) as { amount: mongoose.Types.Decimal128 }[];

    const paidDebts = debts.filter(
      (d) => d.status === 'PAGADO'
    ) as { amount: mongoose.Types.Decimal128 }[];

    return {
      student: student
        ? {
            id: (student as any)._id.toString(),
            firstName: (student as any).firstName,
            lastName: (student as any).lastName,
            dni: (student as any).dni,
          }
        : null,
      debts,
      totalDebt: activeDebts.length > 0 ? sumDecimal128(activeDebts.map((d) => d.amount)).toString() : '0.00',
      totalPaid: paidDebts.length > 0 ? sumDecimal128(paidDebts.map((d) => d.amount)).toString() : '0.00',
    };
  },

  /**
   * Lista todos los alumnos de una sección con sus deudas activas.
   */
  async getSectionDebts(sectionId: string): Promise<{
    students: Array<{
      studentId: string;
      firstName: string;
      lastName: string;
      dni: string;
      debts: IDebt[];
      totalDebt: string;
    }>;
    sectionTotal: string;
  }> {
    const User = (await import('../models/User')).default;

    const activeYear = await SchoolYear.findOne({ status: 'Activo' }).lean();
    if (!activeYear) {
      return { students: [], sectionTotal: '0.00' };
    }

    const enrollments = await Enrollment.find({
      sectionId: new mongoose.Types.ObjectId(sectionId),
      schoolYearId: activeYear._id,
      status: 'active',
    }).select('studentId').lean();

    const studentIds = enrollments.map((e) => e.studentId);
    if (studentIds.length === 0) {
      return { students: [], sectionTotal: '0.00' };
    }

    const users = await User.find({ _id: { $in: studentIds } })
      .select('firstName lastName dni')
      .lean();

    const allDebts = await Debt.find({
      studentId: { $in: studentIds },
      status: { $in: ['PENDIENTE', 'VENCIDO'] },
    }).sort({ createdAt: -1 }).lean() as unknown as IDebt[];

    // Group debts by studentId
    const debtsByStudent = new Map<string, IDebt[]>();
    for (const debt of allDebts) {
      const sid = debt.studentId.toString();
      if (!debtsByStudent.has(sid)) debtsByStudent.set(sid, []);
      debtsByStudent.get(sid)!.push(debt);
    }

    const students = users.map((u: any) => {
      const sid = u._id.toString();
      const debts = debtsByStudent.get(sid) ?? [];
      const totalDebt = debts.length > 0
        ? sumDecimal128((debts as { amount: mongoose.Types.Decimal128 }[]).map((d) => d.amount)).toString()
        : '0.00';
      return {
        studentId: sid,
        firstName: u.firstName,
        lastName: u.lastName,
        dni: u.dni,
        debts,
        totalDebt,
      };
    });

    // Sort: students with debt first
    students.sort((a, b) => parseFloat(b.totalDebt) - parseFloat(a.totalDebt));

    const allAmounts = allDebts as { amount: mongoose.Types.Decimal128 }[];
    const sectionTotal = allAmounts.length > 0
      ? sumDecimal128(allAmounts.map((d) => d.amount)).toString()
      : '0.00';

    return { students, sectionTotal };
  },
};
