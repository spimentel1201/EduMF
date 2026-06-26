import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { SchoolYearStatus } from '../types/academic';
import { schoolYearService } from '../services/schoolYearService';

const STATUS_STYLES: Record<SchoolYearStatus, { bg: string; text: string }> = {
  Activo:     { bg: 'bg-green-100', text: 'text-green-700'  },
  Inactivo:   { bg: 'bg-gray-100',  text: 'text-gray-600'   },
  Finalizado: { bg: 'bg-blue-100',  text: 'text-blue-700'   },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export default function SchoolYearPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchoolYearStatus | ''>('');

  const { data: schoolYears = [], isLoading, error } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const filtered = schoolYears.filter((year) => {
    const matchesSearch = year.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || year.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">Error al cargar años escolares.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>Años Escolares</h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Gestiona los años escolares de la institución.
          </p>
        </div>
        <Link
          to="/school-years/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Año Escolar
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Años Activos',    value: schoolYears.filter(y => y.status === 'Activo').length,     icon: CalendarIcon,    accent: 'bg-green-100 text-green-700'  },
          { label: 'Finalizados',     value: schoolYears.filter(y => y.status === 'Finalizado').length, icon: AcademicCapIcon, accent: 'bg-blue-100 text-blue-700'    },
          { label: 'Total',           value: schoolYears.length,                                        icon: CalendarIcon,    accent: 'bg-purple-100 text-purple-700'},
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex p-1.5 rounded-lg mb-3 ${card.accent}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar año escolar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['', 'Activo', 'Inactivo', 'Finalizado'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as SchoolYearStatus | '')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                statusFilter === s ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
              style={statusFilter === s ? { background: '#538f65' } : {}}
            >
              {s === '' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Nombre</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Fecha Inicio</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Fecha Fin</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((year) => {
                const style = STATUS_STYLES[year.status as SchoolYearStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                return (
                  <tr key={year.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{year.name}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(year.startDate.toString())}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(year.endDate.toString())}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                        {year.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron años escolares.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">{filtered.length} año{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}
