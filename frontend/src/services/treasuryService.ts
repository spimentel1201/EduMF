import { api } from './api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DebtStatus = 'PENDIENTE' | 'EN_VALIDACION' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
export type CashRegisterStatus = 'ABIERTA' | 'CERRADA';
export type TransactionType = 'INGRESO' | 'EGRESO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export interface Debt {
  id: string;
  studentId: string;
  studentName?: string;       // "Apellido, Nombre" — populado por listDebts
  studentDni?: string;
  studentGrade?: number;
  studentSection?: string;
  concept: string;
  amount: string;
  dueDate: string;
  status: DebtStatus;
  voucherUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashRegister {
  id: string;
  openedByUserId: string;
  closedByUserId?: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: string;
  expectedBalance: string;
  realBalance?: string;
  status: CashRegisterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  cashRegisterId?: string;
  debtId?: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: string;       // Decimal128 serializado como string numérico
  voucherUrl?: string;
  registeredByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDebtPayload {
  studentId: string;
  concept: string;
  amount: string;
  dueDate: string;
}

export interface BulkCreateDebtsPayload {
  concept: string;
  amount: string;
  dueDate: string;
  frecuencia?: string;
  grade?: string;
  section?: string;
}

export interface BulkCreateDebtsResult {
  created: number;
  errors: string[];
}

export interface ListDebtsQuery {
  status?: DebtStatus;
  studentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TreasuryStats {
  totalCollected: string;
  totalPending: string;
  totalOverdue: string;
  countPending: number;
  countOverdue: number;
  countPaid: number;
  countCancelled: number;
  countInValidation: number;
}

export interface GradeStats {
  grade: number;
  section: string;
  sectionId: string;
  totalDebt: string;
  countPending: number;
  countOverdue: number;
  studentCount: number;
}

export interface StudentDebtHistory {
  student: { id: string; firstName: string; lastName: string; dni: string } | null;
  debts: Debt[];
  totalDebt: string;
  totalPaid: string;
}

export interface SectionStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  dni: string;
  debts: Debt[];
  totalDebt: string;
}

export interface SectionDebtsResult {
  students: SectionStudent[];
  sectionTotal: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const treasuryService = {

  // ── Debts ──────────────────────────────────────────────────────────────────

  async createDebt(payload: CreateDebtPayload): Promise<Debt> {
    const response = await api.post<{ success: boolean; data: Debt }>(
      '/treasury/debts',
      payload
    );
    return response.data.data;
  },

  async bulkCreateDebts(payload: BulkCreateDebtsPayload): Promise<BulkCreateDebtsResult> {
    const response = await api.post<{
      success: boolean;
      data: BulkCreateDebtsResult;
      message: string;
    }>('/treasury/debts/bulk', payload);
    return response.data.data;
  },

  async listDebts(query: ListDebtsQuery = {}): Promise<PaginatedResponse<Debt>> {
    const response = await api.get<PaginatedResponse<Debt>>('/treasury/debts', {
      params: query,
    });
    return response.data;
  },

  async getDebtById(id: string): Promise<Debt> {
    const response = await api.get<{ success: boolean; data: Debt }>(
      `/treasury/debts/${id}`
    );
    return response.data.data;
  },

  async updateDebt(
    id: string,
    data: { concept?: string; amount?: string; dueDate?: string }
  ): Promise<Debt> {
    const response = await api.patch<{ success: boolean; data: Debt }>(
      `/treasury/debts/${id}`,
      data
    );
    return response.data.data;
  },

  async cancelDebt(id: string): Promise<Debt> {
    const response = await api.delete<{ success: boolean; data: Debt }>(
      `/treasury/debts/${id}`
    );
    return response.data.data;
  },

  async reportTransfer(debtId: string, voucherUrl: string): Promise<Debt> {
    const response = await api.post<{ success: boolean; data: Debt }>(
      `/treasury/debts/${debtId}/report-transfer`,
      { voucherUrl }
    );
    return response.data.data;
  },

  async approveTransfer(debtId: string): Promise<Debt> {
    const response = await api.post<{ success: boolean; data: Debt }>(
      `/treasury/validations/${debtId}/approve`
    );
    return response.data.data;
  },

  async markAsPaid(debtId: string, paymentMethod: 'EFECTIVO' | 'TARJETA'): Promise<Debt> {
    const response = await api.post<{ success: boolean; data: Debt }>(
      `/treasury/debts/${debtId}/pay`,
      { paymentMethod }
    );
    return response.data.data;
  },

  // ── CashRegisters ──────────────────────────────────────────────────────────

  async openCashRegister(initialBalance: string): Promise<CashRegister> {
    const response = await api.post<{ success: boolean; data: CashRegister }>(
      '/treasury/cash-registers/open',
      { initialBalance }
    );
    return response.data.data;
  },

  async registerIncome(
    cashRegisterId: string,
    debtId: string,
    amount: string
  ): Promise<{ cashRegister: CashRegister; transaction: Transaction }> {
    const response = await api.post<{
      success: boolean;
      data: { cashRegister: CashRegister; transaction: Transaction };
    }>(`/treasury/cash-registers/${cashRegisterId}/income`, { debtId, amount });
    return response.data.data;
  },

  async closeCashRegister(
    cashRegisterId: string,
    realBalance: string
  ): Promise<CashRegister> {
    const response = await api.post<{ success: boolean; data: CashRegister }>(
      `/treasury/cash-registers/${cashRegisterId}/close`,
      { realBalance }
    );
    return response.data.data;
  },

  async listCashRegisters(
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<CashRegister>> {
    const response = await api.get<PaginatedResponse<CashRegister>>(
      '/treasury/cash-registers',
      { params: { page, limit } }
    );
    return response.data;
  },

  async getCashRegisterById(
    id: string
  ): Promise<{ cashRegister: CashRegister; transactions: Transaction[] }> {
    const response = await api.get<{
      success: boolean;
      data: { cashRegister: CashRegister; transactions: Transaction[] };
    }>(`/treasury/cash-registers/${id}`);
    return response.data.data;
  },

  // ── Transactions ───────────────────────────────────────────────────────────

  async listTransactions(cashRegisterId?: string): Promise<Transaction[]> {
    const response = await api.get<{ success: boolean; data: Transaction[] }>(
      '/treasury/transactions',
      { params: cashRegisterId ? { cashRegisterId } : {} }
    );
    return response.data.data;
  },

  // ── Stats / Analytics ──────────────────────────────────────────────────────

  async getStats(): Promise<TreasuryStats> {
    const response = await api.get<{ success: boolean; data: TreasuryStats }>('/treasury/stats');
    return response.data.data;
  },

  async getStatsByGrade(): Promise<GradeStats[]> {
    const response = await api.get<{ success: boolean; data: GradeStats[] }>('/treasury/stats/by-grade');
    return response.data.data;
  },

  async getStudentDebtHistory(studentId: string): Promise<StudentDebtHistory> {
    const response = await api.get<{ success: boolean; data: StudentDebtHistory }>(
      `/treasury/students/${studentId}/history`
    );
    return response.data.data;
  },

  async getSectionDebts(sectionId: string): Promise<SectionDebtsResult> {
    const response = await api.get<{ success: boolean; data: SectionDebtsResult }>(
      `/treasury/sections/${sectionId}/debts`
    );
    return response.data.data;
  },
};
