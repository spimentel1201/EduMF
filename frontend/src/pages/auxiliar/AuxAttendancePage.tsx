import { useEffect, useState } from 'react';
import { attendanceService } from '@/services/attendanceService';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function AuxAttendancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await attendanceService.getRecentActivity();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Asistencia</p>
            <h1 className="text-lg font-semibold">Actividad reciente</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-medium text-gray-800">{it.studentName || it.name || 'Estudiante'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {it.status || it.type || 'Registro'} · {it.time ? new Date(it.time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            Sin actividad reciente.
          </div>
        )}
      </div>
    </div>
  );
}
