import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { sectionService } from '../services/sectionService';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';
import { Section } from '../types/academic';
import { Student } from '../types/users';
import { AttendanceRecordDisplay, AttendanceFilterParams } from '../types/attendance';

interface AttendanceRecordsResponse {
  attendanceRecords: AttendanceRecordDisplay[];
  totalRecords: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Presente:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  Tardanza:    { bg: 'bg-orange-100', text: 'text-orange-700' },
  Ausente:     { bg: 'bg-red-100',    text: 'text-red-700'    },
  Justificado: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const EMPTY_DRAFT = { startDate: '', endDate: '', sectionId: '', studentId: '' };

export default function AttendanceRecordsPage() {
  const { t } = useTranslation();

  // draft: lo que el usuario está editando en el panel de filtros
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  // appliedFilters: lo que realmente se envía al servidor (solo cambia al presionar Buscar)
  const [appliedFilters, setAppliedFilters] = useState<AttendanceFilterParams | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(true);

  const { data: sections } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: studentService.getStudents,
  });

  const { data: attendanceData, isLoading } = useQuery<AttendanceRecordsResponse>({
    queryKey: ['attendanceRecords', appliedFilters, currentPage, itemsPerPage],
    queryFn: () => attendanceService.getAttendanceRecords({
      ...appliedFilters!,
      page: currentPage,
      limit: itemsPerPage,
    }),
    enabled: appliedFilters !== null,
  });

  const records = attendanceData?.attendanceRecords ?? [];
  const totalRecords = attendanceData?.totalRecords ?? 0;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  const hasApplied = appliedFilters !== null;
  const hasDraftValues = !!(draft.startDate || draft.endDate || draft.sectionId || draft.studentId);

  function handleSearch() {
    setCurrentPage(1);
    setAppliedFilters({ ...draft, page: 1, limit: itemsPerPage });
  }

  function handleClear() {
    setDraft(EMPTY_DRAFT);
    setAppliedFilters(null);
    setCurrentPage(1);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('attendanceRecords.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {t('attendanceRecords.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors border ${
            hasApplied
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          Filtros
          {hasApplied && <span className="w-2 h-2 rounded-full bg-green-500" />}
        </button>
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.startDate')}
              </label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.endDate')}
              </label>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.section')}
              </label>
              <select
                value={draft.sectionId}
                onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              >
                <option value="">{t('attendanceRecords.allSections')}</option>
                {sections?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.student')}
              </label>
              <select
                value={draft.studentId}
                onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              >
                <option value="">{t('attendanceRecords.allStudents')}</option>
                {students?.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="mt-4 flex items-center justify-end gap-3">
            {(hasDraftValues || hasApplied) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ background: '#538f65' }}
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state: no search yet ── */}
      {!isLoading && !hasApplied && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <CalendarDaysIcon className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">Configura los filtros y presiona <strong>Buscar</strong></p>
          <p className="text-gray-400 text-xs mt-1">Puedes filtrar por fecha, sección o estudiante</p>
        </div>
      )}

      {/* ── Results table ── */}
      {!isLoading && hasApplied && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('attendanceRecords.table.student')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('attendanceRecords.table.section')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('attendanceRecords.table.date')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('attendanceRecords.table.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                      <CalendarDaysIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {t('attendanceRecords.noRecords')}
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const style = STATUS_STYLES[record.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-gray-900">{record.studentName}</td>
                        <td className="px-5 py-3 text-gray-500">{record.sectionName}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(record.date)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer: count + pagination ── */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">
                {totalRecords === 0
                  ? '0 registros'
                  : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalRecords)} de ${totalRecords}`}
              </p>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} por página</option>)}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => handlePageChange(n)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                    style={
                      n === currentPage
                        ? { background: '#538f65', color: '#fff' }
                        : { background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0' }
                    }
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
