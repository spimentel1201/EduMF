import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, TableCellsIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { courseScheduleService } from '../services/courseScheduleService';
import { sectionService } from '../services/sectionService';
import { CourseSchedule, Section } from '../types/academic';
import { useTranslation } from 'react-i18next';

const DAY_MAP: Record<string, string> = {
  Lunes: 'Lunes', Martes: 'Martes', Miércoles: 'Miércoles',
  Jueves: 'Jueves', Viernes: 'Viernes', Sábado: 'Sábado', Domingo: 'Domingo',
};

const DAY_COLORS: Record<string, string> = {
  Lunes:     'bg-blue-50 border-blue-200 text-blue-800',
  Martes:    'bg-purple-50 border-purple-200 text-purple-800',
  Miércoles: 'bg-green-50 border-green-200 text-green-800',
  Jueves:    'bg-orange-50 border-orange-200 text-orange-800',
  Viernes:   'bg-pink-50 border-pink-200 text-pink-800',
};

export default function SchedulesPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['course-schedules'],
    queryFn: courseScheduleService.getAll,
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const days = Array.from(new Set(schedules.map((s) => s.dayOfWeek))).sort();

  const filtered = schedules.filter((s) => {
    const matchesSearch =
      s.courseId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${s.teacherId.firstName} ${s.teacherId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay     = !selectedDay     || s.dayOfWeek === selectedDay;
    const matchesSection = !selectedSectionId || s.sectionId.id === selectedSectionId;
    return matchesSearch && matchesDay && matchesSection;
  });

  // Grid view: group by time slot then day
  const allTimes = Array.from(new Set(filtered.map((s) => s.timeSlotId.startTime))).sort();
  const allDays  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const grouped: Record<string, Record<string, CourseSchedule[]>> = {};
  allTimes.forEach((time) => {
    grouped[time] = {};
    allDays.forEach((d) => { grouped[time][d] = []; });
  });
  filtered.forEach((s) => {
    if (grouped[s.timeSlotId.startTime]?.[s.dayOfWeek]) {
      grouped[s.timeSlotId.startTime][s.dayOfWeek].push(s);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>{t('schedules.title')}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>{t('schedules.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
              style={viewMode === 'list' ? { background: '#538f65' } : {}}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
              style={viewMode === 'grid' ? { background: '#538f65' } : {}}
            >
              <TableCellsIcon className="w-4 h-4" />
            </button>
          </div>
          <Link
            to="/schedules/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
            style={{ background: '#538f65' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
          >
            <PlusIcon className="w-4 h-4" />
            {t('schedules.addSchedule')}
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('schedules.searchSchedules')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">Todos los días</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">Todas las secciones</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">Hora</th>
                  {allDays.map((d) => (
                    <th key={d} className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allTimes.map((time) => (
                  <tr key={time} className="hover:bg-gray-50/30">
                    <td className="px-4 py-3 font-semibold text-gray-700 text-xs whitespace-nowrap">{time}</td>
                    {allDays.map((day) => (
                      <td key={day} className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          {grouped[time]?.[day]?.map((s) => (
                            <div key={s.id} className={`p-2 rounded-lg border text-xs ${DAY_COLORS[day] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                              <p className="font-bold leading-tight">{s.courseId.name}</p>
                              <p className="opacity-75 mt-0.5">{s.teacherId.firstName} {s.teacherId.lastName}</p>
                              {s.classroom && <p className="opacity-60">{s.classroom}</p>}
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                {allTimes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      No se encontraron horarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('schedules.course')}</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('schedules.teacher')}</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('schedules.day')}</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('schedules.time')}</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('schedules.section')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{s.courseId.name}</td>
                    <td className="px-5 py-3 text-gray-500">{s.teacherId.firstName} {s.teacherId.lastName}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${DAY_COLORS[s.dayOfWeek] ?? 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                        {s.dayOfWeek}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{s.timeSlotId.startTime} – {s.timeSlotId.endTime}</td>
                    <td className="px-5 py-3 text-gray-500">{s.sectionId.name}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                      No se encontraron horarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">{filtered.length} horario{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
