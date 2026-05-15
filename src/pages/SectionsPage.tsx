import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { sectionService } from '../services/sectionService';
import { useTranslation } from 'react-i18next';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  Inicial:     { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Primaria:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Secundaria:  { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function SectionsPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  const { data: sections = [], isLoading, error } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const filteredSections = sections.filter((s: any) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.grade).includes(searchTerm);
    const matchesLevel = !selectedLevel || s.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const levels = Array.from(new Set(sections.map((s: any) => s.level).filter(Boolean)));

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
        <p className="text-sm text-red-500">{t('sections.errorLoading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('sections.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {t('sections.subtitle')}
          </p>
        </div>
        <Link
          to="/sections/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <PlusIcon className="w-4 h-4" />
          {t('sections.addSection')}
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Secciones', value: sections.length, accent: 'bg-green-100 text-green-700' },
          { label: 'Activas',         value: sections.filter((s: any) => s.status === 'Activo').length,   accent: 'bg-blue-100 text-blue-700'   },
          { label: 'Inactivas',       value: sections.filter((s: any) => s.status !== 'Activo').length,   accent: 'bg-red-100 text-red-700'     },
          { label: 'Niveles',         value: levels.length,                                               accent: 'bg-purple-100 text-purple-700'},
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`inline-flex p-1.5 rounded-lg mb-2 ${card.accent}`}>
              <AcademicCapIcon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('sections.searchSections')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedLevel('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              !selectedLevel ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={!selectedLevel ? { background: '#538f65' } : {}}
          >
            Todos
          </button>
          {levels.map((level) => (
            <button
              key={level as string}
              onClick={() => setSelectedLevel(level as string)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedLevel === level ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
              style={selectedLevel === level ? { background: '#538f65' } : {}}
            >
              {level as string}
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
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('sections.name')}</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Nivel</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Grado</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('sections.capacity')}</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('sections.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSections.map((section: any) => {
                const levelStyle = LEVEL_COLORS[section.level] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                const isActive = section.status === 'Activo';
                return (
                  <tr key={section.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{section.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${levelStyle.bg} ${levelStyle.text}`}>
                        {section.level}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{section.grade}°</td>
                    <td className="px-5 py-3 text-gray-600">{section.maxStudents} alumnos</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {section.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredSections.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron secciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">{filteredSections.length} sección{filteredSections.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>
    </div>
  );
}
