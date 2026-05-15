import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { treasuryService, GradeStats, SectionStudent } from '../services/treasuryService';

function fmt(amount: string): string {
  return `S/ ${parseFloat(amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_VALIDACION: 'En Validacion',
  PAGADO: 'Pagado', VENCIDO: 'Vencido', ANULADO: 'Anulado',
};
const STATUS_STYLES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800', EN_VALIDACION: 'bg-blue-100 text-blue-800',
  PAGADO: 'bg-green-100 text-green-800', VENCIDO: 'bg-red-100 text-red-800', ANULADO: 'bg-gray-100 text-gray-600',
};

// ─── Modal: Alumnos de la Sección con sus deudas ──────────────────────────────
interface SectionModalProps {
  sectionId: string;
  sectionName: string;
  onClose: () => void;
}

function SectionStudentsModal({ sectionId, sectionName, onClose }: SectionModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [sectionTotal, setSectionTotal] = useState('0.00');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    treasuryService.getSectionDebts(sectionId)
      .then(data => {
        setStudents(data.students);
        setSectionTotal(data.sectionTotal);
      })
      .catch(err => setError(err?.response?.data?.message ?? 'Error al cargar alumnos.'))
      .finally(() => setLoading(false));
  }, [sectionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#EBE8DD]">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{sectionName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Alumnos con deudas pendientes o vencidas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* KPI */}
        <div className="px-8 py-4 border-b border-[#EBE8DD] bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total deuda activa de la seccion</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{fmt(sectionTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alumnos con deuda</p>
              <p className="text-2xl font-bold text-gray-800 mt-0.5">
                {students.filter(s => parseFloat(s.totalDebt) > 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de alumnos */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando alumnos...</p>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-8">{error}</p>
          ) : students.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No hay alumnos matriculados en esta seccion.</p>
          ) : (
            <div className="space-y-3">
              {students.map(student => {
                const hasDebt = parseFloat(student.totalDebt) > 0;
                const isExpanded = expandedStudent === student.studentId;
                return (
                  <div key={student.studentId} className={'rounded-2xl border overflow-hidden ' + (hasDebt ? 'border-[#EBE8DD]' : 'border-gray-100 opacity-60')}>
                    {/* Fila del alumno */}
                    <button
                      onClick={() => hasDebt && setExpandedStudent(isExpanded ? null : student.studentId)}
                      className={'w-full flex items-center justify-between px-5 py-4 text-left ' + (hasDebt ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={'w-9 h-9 rounded-full flex items-center justify-center shrink-0 ' + (hasDebt ? 'bg-[#EAF3EC]' : 'bg-gray-100')}>
                          <UserIcon className={'w-4 h-4 ' + (hasDebt ? 'text-[#538f65]' : 'text-gray-400')} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{student.lastName}, {student.firstName}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{student.dni}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {hasDebt ? (
                          <>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Deuda total</p>
                              <p className="text-sm font-bold text-red-600">{fmt(student.totalDebt)}</p>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-yellow-100 text-yellow-800">
                              {student.debts.length} cobro{student.debts.length !== 1 ? 's' : ''}
                            </span>
                            <span className={'text-gray-400 text-xs font-bold ' + (isExpanded ? 'rotate-180' : '')}>▼</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Sin deudas</span>
                        )}
                      </div>
                    </button>

                    {/* Detalle de deudas del alumno */}
                    {isExpanded && student.debts.length > 0 && (
                      <div className="border-t border-[#EBE8DD] bg-[#FAF9F6]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#EBE8DD]">
                              <th className="px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Concepto</th>
                              <th className="px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Monto</th>
                              <th className="px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Vencimiento</th>
                              <th className="px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F4F2EC]">
                            {student.debts.map(d => (
                              <tr key={d.id} className="hover:bg-white/60">
                                <td className="px-5 py-2.5 text-xs font-medium text-gray-800 max-w-[180px] truncate">{d.concept}</td>
                                <td className="px-5 py-2.5 text-xs font-bold text-gray-900">{fmt(d.amount)}</td>
                                <td className="px-5 py-2.5 text-xs text-gray-600">{fmtDate(d.dueDate)}</td>
                                <td className="px-5 py-2.5">
                                  <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ' + (STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-600')}>
                                    {STATUS_LABELS[d.status] ?? d.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#EBE8DD]">
          <button onClick={onClose} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DebtsByGradePage ─────────────────────────────────────────────────────────

export default function DebtsByGradePage() {
  const [gradeStats, setGradeStats] = useState<GradeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    treasuryService
      .getStatsByGrade()
      .then(setGradeStats)
      .catch((err) => {
        setError(err?.response?.data?.message ?? 'Error al cargar estadísticas por grado.');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Export PDF ───────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Deuda por Grado/Sección - EduMF', 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [['Grado', 'Sección', 'Alumnos', 'Deuda Total', 'Pendientes', 'Vencidos']],
      body: gradeStats.map((g) => [
        `${g.grade}°`,
        g.section,
        g.studentCount,
        fmt(g.totalDebt),
        g.countPending,
        g.countOverdue,
      ]),
      headStyles: { fillColor: [83, 143, 101] },
    });
    doc.save('deuda-por-grado.pdf');
  };

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = gradeStats.map((g) => ({
      Grado: `${g.grade}°`,
      Sección: g.section,
      Alumnos: g.studentCount,
      'Deuda Total': parseFloat(g.totalDebt),
      Pendientes: g.countPending,
      Vencidos: g.countOverdue,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deuda por Grado');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'deuda-por-grado.xlsx');
  };

  // ── Chart data ───────────────────────────────────────────────────────────
  const chartData = gradeStats.map((g) => ({
    name: `${g.grade}°${g.section}`,
    deuda: parseFloat(g.totalDebt),
  }));

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
            <span className="text-[#538f65]">Deuda por Grado</span>
          </div>
          <h1 className="text-[2rem] font-bold text-[#1F2937] leading-tight">
            Deuda por Grado y Sección
          </h1>
          <p className="text-[14px] font-medium text-gray-500 mt-1">
            Distribución de deudas agrupadas por grado y sección
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-300 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm"
          >
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#538f65] text-white text-sm font-bold rounded-xl hover:bg-[#3f7350] transition-colors shadow-sm"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm font-medium">
          Cargando estadísticas...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24 text-red-500 text-sm font-medium">
          {error}
        </div>
      ) : (
        <>
          {/* ── Bar Chart ── */}
          <div className="bg-white rounded-[2rem] border border-[#EBE8DD] shadow-sm p-8 mb-8">
            <h2 className="text-[1.1rem] font-bold text-gray-800 mb-6">
              Deuda Total por Grado/Sección
            </h2>
            {chartData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">Sin datos disponibles.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F2EC" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `S/${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Deuda Total']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #EBE8DD',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="deuda" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#538f65" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-[2rem] border border-[#EBE8DD] shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-[#EBE8DD]">
              <h2 className="text-[1.1rem] font-bold text-gray-800">Detalle por Grado y Sección</h2>
            </div>

            <div className="overflow-x-auto">
              {gradeStats.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Sin datos disponibles.</p>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-white border-b border-[#EBE8DD]">
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Grado</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Sección</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Alumnos</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Deuda Total</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Pendientes</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Vencidos</th>
                      <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F2EC]">
                    {gradeStats.map((g) => (
                      <tr key={g.sectionId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4 text-sm font-bold text-gray-800">{g.grade}°</td>
                        <td className="px-8 py-4 text-sm font-medium text-gray-700">{g.section}</td>
                        <td className="px-8 py-4 text-sm text-gray-600">{g.studentCount}</td>
                        <td className="px-8 py-4 text-sm font-bold text-gray-900">{fmt(g.totalDebt)}</td>
                        <td className="px-8 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800">
                            {g.countPending}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            {g.countOverdue}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() =>
                              setSelectedStudent({
                                id: g.sectionId,
                                name: `${g.grade}° Grado - Sección ${g.section}`,
                              })
                            }
                            className="text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors"
                          >
                            Ver alumnos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── SectionStudentsModal ── */}
      {selectedStudent && (
        <SectionStudentsModal
          sectionId={selectedStudent.id}
          sectionName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
