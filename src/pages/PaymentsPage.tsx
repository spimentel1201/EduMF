import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  PencilSquareIcon,
  XCircleIcon,
  EyeIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  treasuryService,
  Debt,
  DebtStatus,
  TreasuryStats,
} from '../services/treasuryService';

function fmt(amount: string): string {
  return 'S/ ' + parseFloat(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<DebtStatus, string> = {
  PENDIENTE:     'bg-yellow-100 text-yellow-800',
  EN_VALIDACION: 'bg-blue-100 text-blue-800',
  PAGADO:        'bg-green-100 text-green-800',
  VENCIDO:       'bg-red-100 text-red-800',
  ANULADO:       'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<DebtStatus, string> = {
  PENDIENTE:     'Pendiente',
  EN_VALIDACION: 'En Validacion',
  PAGADO:        'Pagado',
  VENCIDO:       'Vencido',
  ANULADO:       'Anulado',
};

const EDITABLE_STATUSES: DebtStatus[] = ['PENDIENTE', 'VENCIDO'];
const LIMIT = 10;
const FC = 'w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 text-gray-800';
const LC = 'block text-xs font-bold text-gray-600 mb-1.5';

// ─── Modal Editar ─────────────────────────────────────────────────────────────
interface EditProps { debt: Debt; onClose: () => void; onSaved: (d: Debt) => void; }
function EditDebtModal({ debt, onClose, onSaved }: EditProps) {
  const [concept, setConcept] = useState(debt.concept);
  const [amount, setAmount] = useState(debt.amount);
  const [dueDate, setDueDate] = useState(debt.dueDate.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  


  const handleSave = async () => {
    setError(null);
    if (!concept.trim()) { setError('Concepto requerido.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Monto debe ser mayor a 0.'); return; }
    try {
      setLoading(true);
      const updated = await treasuryService.updateDebt(debt.id, {
        concept,
        amount: parseFloat(amount).toFixed(2),
        dueDate: new Date(dueDate).toISOString(),
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al actualizar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Editar Cobro</h2>
        <div className="space-y-4">
          <div>
            <label className={LC}>Concepto</label>
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)} className={FC} />
          </div>
          <div>
            <label className={LC}>Monto (S/)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={FC} />
          </div>
          <div>
            <label className={LC}>Fecha de Vencimiento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={FC} />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-[#538f65] text-white rounded-xl text-sm font-bold hover:bg-[#3f7350] disabled:opacity-60">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Anular ─────────────────────────────────────────────────────────────
interface CancelProps { debt: Debt; onClose: () => void; onConfirmed: (d: Debt) => void; }
function CancelDebtModal({ debt, onClose, onConfirmed }: CancelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      setLoading(true);
      onConfirmed(await treasuryService.cancelDebt(debt.id));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al anular.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
            <XCircleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Anular Cobro</h2>
        </div>
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-bold text-gray-800">{debt.concept}</p>
          <p className="text-sm text-gray-500">{fmt(debt.amount)} - Vence {fmtDate(debt.dueDate)}</p>
        </div>
        <p className="text-xs text-gray-400 mb-6">Esta accion no se puede deshacer.</p>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
            {loading ? 'Anulando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ver Detalle ────────────────────────────────────────────────────────
interface DetailProps { debt: Debt; onClose: () => void; onAction: (d: Debt) => void; }
function DebtDetailModal({ debt, onClose, onAction }: DetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-1">Detalle del Cobro</h2>
        <p className="text-xs text-gray-400 mb-6">Informacion completa del cobro</p>

        {/* Estado badge */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-bold text-gray-600">Estado actual</span>
          <span className={'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ' + STATUS_STYLES[debt.status]}>
            {STATUS_LABELS[debt.status]}
          </span>
        </div>

        {/* Campos */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-start py-3 border-b border-[#F4F2EC]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Concepto</span>
            <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%]">{debt.concept}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#F4F2EC]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monto</span>
            <span className="text-lg font-bold text-[#538f65]">{fmt(debt.amount)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#F4F2EC]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vencimiento</span>
            <span className="text-sm font-semibold text-gray-700">{fmtDate(debt.dueDate)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#F4F2EC]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Creado</span>
            <span className="text-sm text-gray-500">{fmtDate(debt.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#F4F2EC]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ID Alumno</span>
            <span className="text-xs font-mono text-gray-500 truncate max-w-[55%]">{debt.studentId}</span>
          </div>
          {debt.voucherUrl && !debt.voucherUrl.startsWith('EFECTIVO') && (
            <div className="flex justify-between items-center py-3 border-b border-[#F4F2EC]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cod. Yape</span>
              <span className="text-sm font-bold text-purple-700">{debt.voucherUrl.replace('YAPE-', '')}</span>
            </div>
          )}
        </div>

        {/* Acciones contextuales segun estado */}
        <div className="space-y-2">
          {(debt.status === 'PENDIENTE' || debt.status === 'VENCIDO') && (
            <button
              onClick={() => onAction(debt)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #538f65 0%, #3f7350 100%)' }}
            >
              Registrar Cobro
            </button>
          )}
          {debt.status === 'EN_VALIDACION' && (
            <button
              onClick={() => onAction(debt)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #6D28D9 100%)' }}
            >
              Aprobar Pago Yape
            </button>
          )}
          {debt.status === 'PAGADO' && (
            <div className="w-full py-3 rounded-xl text-sm font-bold text-center bg-[#EAF3EC] text-[#538f65]">
              Cobro completado
            </div>
          )}
          {debt.status === 'ANULADO' && (
            <div className="w-full py-3 rounded-xl text-sm font-bold text-center bg-gray-100 text-gray-500">
              Cobro anulado
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Modal Registrar Cobro ────────────────────────────────────────────────────
interface PayProps { debt: Debt; onClose: () => void; onPaid: (d: Debt) => void; }
function RegisterPaymentModal({ debt, onClose, onPaid }: PayProps) {
  const [method, setMethod] = useState<'EFECTIVO' | 'YAPE'>('EFECTIVO');
  const [operationCode, setOperationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidation = debt.status === 'EN_VALIDACION';

  const handlePay = async () => {
    setError(null);
    try {
      setLoading(true);
      let updated: Debt;
      if (isValidation) {
        updated = await treasuryService.approveTransfer(debt.id);
      } else if (method === 'YAPE') {
        if (!operationCode.trim()) {
          setError('El numero de operacion es requerido.');
          setLoading(false);
          return;
        }
        // Reportar con el codigo de operacion como voucher reference
        updated = await treasuryService.reportTransfer(debt.id, `YAPE-${operationCode.trim()}`);
      } else {
        // Efectivo: reportar + aprobar en secuencia
        updated = await treasuryService.reportTransfer(debt.id, 'EFECTIVO-DIRECTO');
        updated = await treasuryService.approveTransfer(debt.id);
      }
      onPaid(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF3EC] flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="w-6 h-6 text-[#538f65]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isValidation ? 'Aprobar Pago Yape' : 'Registrar Cobro'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isValidation ? 'Confirma el pago por Yape' : 'Selecciona el metodo de pago'}
            </p>
          </div>
        </div>

        {/* Detalle de la deuda */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm font-bold text-gray-800 mb-1">{debt.concept}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Monto a cobrar</span>
            <span className="text-lg font-bold text-[#538f65]">{fmt(debt.amount)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">Vencimiento</span>
            <span className="text-xs font-semibold text-gray-700">{fmtDate(debt.dueDate)}</span>
          </div>
          {debt.voucherUrl && !debt.voucherUrl.startsWith('EFECTIVO') && (
            <div className="mt-2 pt-2 border-t border-[#EBE8DD]">
              <p className="text-xs text-gray-500">Codigo reportado:</p>
              <p className="text-xs font-bold text-purple-700">{debt.voucherUrl.replace('YAPE-', '')}</p>
            </div>
          )}
        </div>

        {/* Selector de metodo */}
        {!isValidation && (
          <div className="mb-5">
            <label className={LC}>Metodo de pago</label>
            <div className="flex gap-3">
              {/* Efectivo */}
              <button
                type="button"
                onClick={() => setMethod('EFECTIVO')}
                className={'flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ' +
                  (method === 'EFECTIVO'
                    ? 'border-[#538f65] bg-[#EAF3EC] text-[#538f65]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300')}
              >
                Efectivo
              </button>

              {/* Yape — boton morado con degradé */}
              <button
                type="button"
                onClick={() => setMethod('YAPE')}
                className={'flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ' +
                  (method === 'YAPE'
                    ? 'border-transparent text-white'
                    : 'border-gray-200 text-gray-500 hover:border-purple-300')}
                style={method === 'YAPE'
                  ? { background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #6D28D9 100%)', borderColor: 'transparent' }
                  : {}}
              >
                Yape
              </button>
            </div>
          </div>
        )}

        {/* Codigo de operacion (solo Yape) */}
        {!isValidation && method === 'YAPE' && (
          <div className="mb-5">
            <label className={LC}>Numero de operacion / Codigo de confirmacion</label>
            <input
              type="text"
              placeholder="Ej. 123456789"
              value={operationCode}
              onChange={e => setOperationCode(e.target.value)}
              className={FC}
            />
            <p className="text-[11px] text-purple-500 mt-1 font-medium">
              El cobro pasara a "En Validacion" hasta ser aprobado por un administrador.
            </p>
          </div>
        )}

        {/* Info si ya esta en validacion */}
        {isValidation && (
          <div className="mb-5 rounded-xl px-4 py-3 border"
            style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#c4b5fd' }}>
            <p className="text-sm font-bold text-purple-800">Pago Yape pendiente de aprobacion</p>
            <p className="text-xs text-purple-600 mt-1">
              Al confirmar, el cobro pasara a estado PAGADO y se registrara la transaccion.
            </p>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
            style={
              isValidation || method === 'YAPE'
                ? { background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #6D28D9 100%)' }
                : { background: '#538f65' }
            }
          >
            {loading
              ? 'Procesando...'
              : isValidation
              ? 'Aprobar Pago Yape'
              : method === 'EFECTIVO'
              ? 'Confirmar Cobro'
              : 'Reportar Yape'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagina principal ─────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [cancellingDebt, setCancellingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewingDebt, setViewingDebt] = useState<Debt | null>(null);


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const loadDebts = useCallback(async () => {
    setLoadingTable(true);
    setTableError(null);
    try {
      const res = await treasuryService.listDebts({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
      });
      setDebts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setTableError(err?.response?.data?.message ?? 'Error al cargar cobros.');
    } finally {
      setLoadingTable(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  useEffect(() => {
    treasuryService.getStats().then(setStats).catch(() => {});
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
    // Recargar stats
    treasuryService.getStats().then(setStats).catch(() => {});
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Cobros - EduMF', 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [['Concepto', 'Monto', 'Vencimiento', 'Estado']],
      body: debts.map(d => [d.concept, fmt(d.amount), fmtDate(d.dueDate), STATUS_LABELS[d.status]]),
      headStyles: { fillColor: [83, 143, 101] },
    });
    doc.save('cobros-edumf.pdf');
  };

  const exportExcel = () => {
    const rows = debts.map(d => ({
      Concepto: d.concept,
      Monto: parseFloat(d.amount),
      Vencimiento: fmtDate(d.dueDate),
      Estado: STATUS_LABELS[d.status],
      Creado: fmtDate(d.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobros');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'cobros-edumf.xlsx');
  };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  // Determina si un cobro puede registrar pago
  const canPay = (d: Debt) =>
    d.status === 'PENDIENTE' || d.status === 'VENCIDO' || d.status === 'EN_VALIDACION';

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans w-full">

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cobros..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[2rem] font-bold text-[#1F2937] leading-tight">Caja y Pagos</h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">Gestion de cobros y deudas estudiantiles</p>
        </div>
        <Link to="/payments/new" className="inline-flex items-center gap-2 px-6 py-3 bg-[#538f65] text-white text-sm font-bold rounded-xl hover:bg-[#3f7350] transition-colors shadow-sm">
          + Generar Nuevo Cargo
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#6CA07C] rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between h-[160px]">
          <div className="absolute right-4 bottom-4 opacity-10">
            <BanknotesIcon className="w-24 h-24 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/70 mb-1">Total Recaudado</p>
            <h3 className="text-[2rem] font-bold text-white leading-none">{stats ? fmt(stats.totalCollected) : '...'}</h3>
          </div>
          <p className="text-xs font-bold text-white/60 mt-4">{stats ? stats.countPaid + ' cobros pagados' : ''}</p>
        </div>

        <div className="bg-[#F2EFE8] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div>
            <p className="text-[13px] font-bold text-gray-500 mb-1">Total Pendiente</p>
            <h3 className="text-[2rem] font-bold text-gray-900 leading-none">{stats ? fmt(stats.totalPending) : '...'}</h3>
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4">{stats ? stats.countPending + ' cobros pendientes' : ''}</p>
        </div>

        <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div>
            <p className="text-[13px] font-bold text-gray-500 mb-1">Cobros Vencidos</p>
            <h3 className="text-[2rem] font-bold text-red-600 leading-none">{stats ? stats.countOverdue : '...'}</h3>
          </div>
          <Link to="/payments/defaulters" className="text-xs font-bold text-[#538f65] hover:text-[#3f7350] transition-colors mt-4">
            Ver reporte de morosos
          </Link>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[2rem] border border-[#EBE8DD] shadow-sm overflow-hidden mb-8">
        <div className="px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE8DD]">
          <h2 className="text-[1.1rem] font-bold text-gray-800">Lista de Cobros</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as DebtStatus | '')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none text-gray-700 bg-white"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as DebtStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button onClick={exportPDF} className="px-4 py-2 text-sm font-bold border border-red-400 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
              PDF
            </button>
            <button onClick={exportExcel} className="px-4 py-2 text-sm font-bold border border-[#538f65] text-[#538f65] rounded-xl hover:bg-green-50 transition-colors">
              Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingTable ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Cargando cobros...</div>
          ) : tableError ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{tableError}</div>
          ) : debts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              No se encontraron cobros.{' '}
              <Link to="/payments/new" className="ml-1 text-[#538f65] font-semibold hover:underline">Crear el primero</Link>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#EBE8DD]">
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Grado/Sec.</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Concepto</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EC]">
                {debts.map(debt => {
                  const canEdit = EDITABLE_STATUSES.includes(debt.status);
                  const canRegisterPay = canPay(debt);
                  return (
                    <tr key={debt.id} className={'hover:bg-gray-50/50 transition-colors' + (debt.status === 'ANULADO' ? ' opacity-50' : '')}>
                      {/* Alumno */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {debt.studentName ? (
                          <>
                            <p className="text-sm font-bold text-gray-800">{debt.studentName}</p>
                            {debt.studentDni && <p className="text-[11px] text-gray-400 font-mono">{debt.studentDni}</p>}
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{debt.studentId}</p>
                        )}
                      </td>
                      {/* Grado/Sección */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {debt.studentGrade ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EAF3EC] text-[#538f65]">
                            {debt.studentGrade}° {debt.studentSection}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Concepto */}
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 max-w-[160px] truncate">{debt.concept}</td>
                      {/* Monto */}
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmt(debt.amount)}</td>
                      {/* Vencimiento */}
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(debt.dueDate)}</td>
                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ' + STATUS_STYLES[debt.status]}>
                          {STATUS_LABELS[debt.status]}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                                                    {/* Registrar cobro */}
                          {canRegisterPay && (
                            <button
                              onClick={() => setPayingDebt(debt)}
                              title={debt.status === 'EN_VALIDACION' ? 'Aprobar transferencia' : 'Registrar cobro'}
                              className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                                (debt.status === 'EN_VALIDACION'
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  : 'bg-[#EAF3EC] text-[#538f65] hover:bg-green-100')}
                            >
                              <CurrencyDollarIcon className="w-3.5 h-3.5" />
                              {debt.status === 'EN_VALIDACION' ? 'Aprobar' : 'Cobrar'}
                            </button>
                          )}
                          {/* Editar */}
                          {canEdit && (
                            <button
                              onClick={() => setEditingDebt(debt)}
                              title="Editar"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#538f65] hover:bg-green-50 transition-colors"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}
                          {/* Anular */}
                          {canEdit && (
                            <button
                              onClick={() => setCancellingDebt(debt)}
                              title="Anular"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          )}
                          {/* Ver detalle */}
                          <button
                            onClick={() => setViewingDebt(debt)}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loadingTable && !tableError && total > 0 && (
          <div className="px-8 py-5 flex items-center justify-between border-t border-[#EBE8DD] text-sm text-gray-400 font-medium bg-white">
            <p>Mostrando {(page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, total)} de {total} cobros</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {pageNumbers.map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ' +
                    (n === page ? 'bg-[#538f65] text-white' : 'text-gray-600 hover:bg-gray-100')}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/payments/by-grade"
          className="bg-[#C1A866] rounded-[2rem] p-8 flex items-center gap-6 hover:opacity-90 transition-opacity"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <ChartBarIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Deuda por Grado/Seccion</h3>
            <p className="text-sm text-white/70 mt-1">Analiza la distribucion de deudas por grado y seccion</p>
          </div>
        </Link>
        <div className="bg-[#EBE9DA] border border-[#DDD9C8] rounded-[2rem] p-8 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
            <ChatBubbleLeftRightIcon className="w-7 h-7 text-[#538f65]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Gestion de Cobros</h3>
            <p className="text-sm text-gray-500 mt-1">Administra, edita y anula cobros desde esta seccion</p>
          </div>
        </div>
      </div>

      {/* Modales */}
      {editingDebt && (
        <EditDebtModal
          debt={editingDebt}
          onClose={() => setEditingDebt(null)}
          onSaved={updated => {
            setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
            setEditingDebt(null);
            showSuccess('Cobro actualizado correctamente.');
          }}
        />
      )}

      {cancellingDebt && (
        <CancelDebtModal
          debt={cancellingDebt}
          onClose={() => setCancellingDebt(null)}
          onConfirmed={cancelled => {
            setDebts(prev => prev.map(d => d.id === cancelled.id ? cancelled : d));
            setCancellingDebt(null);
            showSuccess('Cobro anulado correctamente.');
          }}
        />
      )}

      {payingDebt && (
        <RegisterPaymentModal
          debt={payingDebt}
          onClose={() => setPayingDebt(null)}
          onPaid={paid => {
            setDebts(prev => prev.map(d => d.id === paid.id ? paid : d));
            setPayingDebt(null);
            showSuccess(
              paid.status === 'PAGADO'
                ? 'Cobro registrado como PAGADO correctamente.'
                : 'Transferencia reportada. Pendiente de aprobacion.'
            );
          }}
        />
      )}

      {viewingDebt && (
        <DebtDetailModal
          debt={viewingDebt}
          onClose={() => setViewingDebt(null)}
          onAction={debt => {
            setViewingDebt(null);
            setPayingDebt(debt);
          }}
        />
      )}


      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-[#1C1F1E] text-white rounded-2xl shadow-2xl text-sm font-bold">
          <CheckCircleIcon className="w-5 h-5 text-[#6CA07C] shrink-0" />
          {successMsg}
        </div>
      )}
    </div>
  );
}
