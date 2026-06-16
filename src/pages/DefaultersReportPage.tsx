import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  WalletIcon,
  UsersIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { treasuryService, Debt } from '../services/treasuryService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import { addInstitutionHeaderToPDF } from '@/utils/institutionHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string): string {
  return `S/ ${parseFloat(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysOverdue(dueDate: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE:      'Pendiente',
  EN_VALIDACION:  'En Validación',
  PAGADO:         'Pagado',
  VENCIDO:        'Vencido',
  ANULADO:        'Anulado',
};

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:      'bg-yellow-100 text-yellow-800',
  EN_VALIDACION:  'bg-blue-100 text-blue-800',
  PAGADO:         'bg-green-100 text-green-800',
  VENCIDO:        'bg-red-100 text-red-800',
  ANULADO:        'bg-gray-100 text-gray-600',
};

const LIMIT = 10;

// ─── StudentHistoryModal ──────────────────────────────────────────────────────

interface StudentHistoryModalProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

function StudentHistoryModal({ studentId, studentName, onClose }: StudentHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState('0');
  const [totalPaid, setTotalPaid] = useState('0');

  useEffect(() => {
    treasuryService
      .getStudentDebtHistory(studentId)
      .then((data) => {
        setDebts(data.debts);
        setTotalDebt(data.totalDebt);
        setTotalPaid(data.totalPaid);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Error al cargar el historial.');
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#EBE8DD]">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{studentName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Historial de deudas</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 px-8 py-5 border-b border-[#EBE8DD]">
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl px-5 py-4">
            <p className="text-[11px] font-bold text-gray-400 mb-1">Total Adeudado</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalDebt)}</p>
          </div>
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl px-5 py-4">
            <p className="text-[11px] font-bold text-gray-400 mb-1">Total Pagado</p>
            <p className="text-xl font-bold text-[#538f65]">{fmt(totalPaid)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando historial...</p>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-8">{error}</p>
          ) : debts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Sin deudas registradas.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBE8DD]">
                  <th className="pb-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">Concepto</th>
                  <th className="pb-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="pb-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                  <th className="pb-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EC]">
                {debts.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium text-gray-800 max-w-[160px] truncate">{d.concept}</td>
                    <td className="py-3 pr-4 text-sm font-bold text-gray-900">{fmt(d.amount)}</td>
                    <td className="py-3 pr-4 text-sm text-gray-600">{fmtDate(d.dueDate)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#EBE8DD]">
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DefaultersReportPage ─────────────────────────────────────────────────────

export default function DefaultersReportPage() {
  const { data: institutionSettings } = useInstitutionSettings();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  // ── Load debts ─────────────────────────────────────────────────────────────
  const loadDebts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await treasuryService.listDebts({
        status: 'VENCIDO',
        page,
        limit: LIMIT,
      });
      setDebts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al cargar los morosos.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // ── KPI calculations ───────────────────────────────────────────────────────
  const totalDebtAmount = debts.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const avgPerDebtor = total > 0 ? totalDebtAmount / total : 0;

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    const startY = addInstitutionHeaderToPDF(doc, institutionSettings, 'Análisis de Cartera Pendiente — Cobros Vencidos');

    // Summary sub-header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Exportado el ${today}  |  Total vencidos: ${total}  |  Monto total: ${`S/ ${totalDebtAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}`, margin, startY);

    autoTable(doc, {
      startY: startY + 8,
      margin: { left: margin, right: margin },
      head: [['Alumno', 'DNI', 'Grado/Sec.', 'Concepto', 'Monto', 'Vencimiento', 'Días Vencido']],
      body: debts.map((d) => [
        d.studentName ?? 'Sin nombre',
        d.studentDni ?? '-',
        d.studentGrade ? `${d.studentGrade}° ${d.studentSection}` : '-',
        d.concept,
        fmt(d.amount),
        fmtDate(d.dueDate),
        `${daysOverdue(d.dueDate)} días`,
      ]),
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 50 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 25 },
      },
    });

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`Página ${i} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`Reporte_Morosos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = debts.map((d) => ({
      Concepto: d.concept,
      Monto: parseFloat(d.amount),
      Vencimiento: fmtDate(d.dueDate),
      'Días Vencido': daysOverdue(d.dueDate),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Morosos');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'morosos-edumf.xlsx');
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans w-full">

      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[13px] font-bold text-gray-400 mb-2">
            <Link to="/payments" className="hover:text-gray-600 transition-colors">
              Caja y Pagos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#538f65]">Reporte de Morosos</span>
          </div>
          <h1 className="text-[2rem] font-bold text-[#1F2937] leading-tight">
            Análisis de Cartera Pendiente
          </h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">
            Cobros con estado VENCIDO
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#538f65] text-white text-sm font-bold rounded-xl hover:bg-[#3f7350] transition-colors shadow-sm"
          >
            <TableCellsIcon className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Total deuda vencida */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Total Deuda Vencida</p>
              <h3 className="text-[2rem] font-bold text-red-600 leading-none">
                {loading ? '—' : `S/ ${totalDebtAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <WalletIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4">
            Suma de cobros vencidos en esta página
          </p>
        </div>

        {/* Alumnos con deuda */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Cobros Vencidos</p>
              <h3 className="text-[2rem] font-bold text-gray-900 leading-none">
                {loading ? '—' : total}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#CEB58A] flex items-center justify-center shrink-0">
              <UsersIcon className="w-6 h-6 text-[#684C27]" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4">
            Total de cobros con estado vencido
          </p>
        </div>

        {/* Promedio por cobro */}
        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-6 flex flex-col justify-between h-[160px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-gray-400 mb-1">Promedio por Cobro</p>
              <h3 className="text-[2rem] font-bold text-gray-900 leading-none">
                {loading
                  ? '—'
                  : `S/ ${avgPerDebtor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#8BB89A] flex items-center justify-center shrink-0">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4">
            Monto promedio por cobro vencido
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-[2rem] border border-[#EBE8DD] shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-[#EBE8DD]">
          <h2 className="text-[1.1rem] font-bold text-gray-800">Lista de Cobros Vencidos</h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm font-medium">
              Cargando morosos...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm font-medium">
              {error}
            </div>
          ) : debts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm font-medium">
              No hay cobros vencidos.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white border-b border-[#EBE8DD]">
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Concepto</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Monto Adeudado</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Días Vencido</th>
                  <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EC]">
                {debts.map((debt) => {
                  const days = daysOverdue(debt.dueDate);
                  return (
                    <tr key={debt.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-4 text-sm font-medium text-gray-800 max-w-[200px] truncate">
                        {debt.concept}
                      </td>
                      <td className="px-8 py-4 text-sm font-bold text-red-600">
                        {fmt(debt.amount)}
                      </td>
                      <td className="px-8 py-4 text-sm text-gray-600">
                        {fmtDate(debt.dueDate)}
                      </td>
                      <td className="px-8 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                          {days} {days === 1 ? 'día' : 'días'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentId(debt.studentId);
                            setSelectedStudentName(`Alumno — ${debt.concept}`);
                          }}
                          className="text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors"
                        >
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-8 py-5 flex items-center justify-between border-t border-[#EBE8DD] text-sm text-gray-400 font-medium bg-white">
            <p>
              Mostrando {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total} cobros vencidos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    n === page
                      ? 'bg-[#538f65] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── StudentHistoryModal ── */}
      {selectedStudentId && selectedStudentName && (
        <StudentHistoryModal
          studentId={selectedStudentId}
          studentName={selectedStudentName}
          onClose={() => {
            setSelectedStudentId(null);
            setSelectedStudentName(null);
          }}
        />
      )}
    </div>
  );
}
