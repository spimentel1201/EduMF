import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { timeSlotService } from '@/services/timeSlotService';
import type { TimeSlot } from '@/types/academic';
import { useTranslation } from 'react-i18next';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Clase:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Receso:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Almuerzo: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function TimeSlotsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: timeSlots = [], isLoading, error } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timeSlotService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeSlots'] }),
    onError: () => alert(t('timeSlots.deleteError')),
  });

  const handleDelete = (ts: TimeSlot) => {
    if (window.confirm(t('timeSlots.confirmDelete', { name: ts.name }))) {
      deleteMutation.mutate(ts.id);
    }
  };

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
        <p className="text-sm text-red-500">{t('timeSlots.errorLoading')}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['timeSlots'] })}
          className="mt-2 text-sm font-semibold text-green-700 hover:text-green-900"
        >
          {t('timeSlots.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('timeSlots.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {t('timeSlots.subtitle')}
          </p>
        </div>
        <Link
          to="/time-slots/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <PlusIcon className="w-4 h-4" />
          {t('timeSlots.newTimeSlot')}
        </Link>
      </div>

      {/* ── Empty state ── */}
      {timeSlots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ClockIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{t('timeSlots.noTimeSlots')}</p>
          <p className="text-xs mt-1">{t('timeSlots.createFirstTimeSlot')}</p>
          <Link
            to="/time-slots/new"
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
            style={{ background: '#538f65' }}
          >
            <PlusIcon className="w-4 h-4" />
            {t('timeSlots.newTimeSlot')}
          </Link>
        </div>
      ) : (
        /* ── Table ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('timeSlots.name')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('timeSlots.schedule')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('timeSlots.type')}
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('timeSlots.status')}
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('timeSlots.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {timeSlots.map((ts) => {
                  const typeStyle = TYPE_STYLES[ts.type] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                  const isActive = ts.status === 'Activo';
                  return (
                    <tr key={ts.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <ClockIcon className="w-4 h-4 text-green-700" />
                          </div>
                          <span className="font-semibold text-gray-900">{ts.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-medium">
                        {ts.startTime} – {ts.endTime}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                          {ts.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {ts.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/time-slots/${ts.id}/edit`}
                            className="text-gray-400 hover:text-green-700 transition-colors"
                            title={t('timeSlots.edit')}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(ts)}
                            disabled={deleteMutation.isPending}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                            title={t('timeSlots.delete')}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">{timeSlots.length} franja{timeSlots.length !== 1 ? 's' : ''} horaria{timeSlots.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
