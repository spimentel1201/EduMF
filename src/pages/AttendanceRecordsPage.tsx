import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
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

export default function AttendanceRecordsPage() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<AttendanceFilterParams>({
    startDate: '',
    endDate: '',
    sectionId: '',
    studentId: '',
    page: currentPage,
    limit: itemsPerPage,
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: studentService.getStudents,
  });

  const { data: attendanceData, isLoading, refetch } = useQuery<AttendanceRecordsResponse>({
    queryKey: ['attendanceRecords', filters],
    queryFn: () => attendanceService.getAttendanceRecords(filters),
  });

  const records = attendanceData?.attendanceRecords ?? [];
  const totalRecords = attendanceData?.totalRecords ?? 0;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: currentPage, limit: itemsPerPage }));
  }, [currentPage, itemsPerPage]);

  useEffect(() => { refetch(); }, [filters]);

  const hasActiveFilters = filters.startDate || filters.endDate || filters.sectionId || filters.studentId;

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
            hasActiveFilters
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
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
                value={filters.startDate}
                onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.endDate')}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('attendanceRecords.section')}
              </label>
              <select
                value={filters.sectionId}
                onChange={(e) => { setFilters({ ...filters, sectionId: e.target.value }); setCurrentPage(1); }}
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
                value={filters.studentId}
                onChange={(e) => { setFilters({ ...filters, studentId: e.target.value }); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              >
                <option value="">{t('attendanceRecords.allStudents')}</option>
                {students?.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({ startDate: '', endDate: '', sectionId: '', studentId: '', page: 1, limit: itemsPerPage });
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && (
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
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} por página</option>)}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentPage(n)}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
