import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const statusStyle: Record<string, string> = {
  Presente: 'bg-emerald-100 text-emerald-700',
  Tardanza: 'bg-amber-100 text-amber-700',
  Ausente: 'bg-rose-100 text-rose-700',
  Justificado: 'bg-blue-100 text-blue-700',
};

export default function AuxAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.get('/attendances/attendance-records', { params: { startDate: today, endDate: today } });
        setRecords(res.data.data || []);
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
            <h1 className="text-lg font-semibold">Registros de hoy</h1>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-3">{records.length} registro(s)</p>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {records.map((r, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-gray-800 truncate">{r.studentName || 'Estudiante'}</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[r.status] || 'bg-gray-100 text-gray-600'}`}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">{r.sectionName || 'Sección'}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Entrada: {r.horaEntrada ? new Date(r.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              <span>Salida: {r.horaSalida ? new Date(r.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            Sin registros de asistencia hoy.
          </div>
        )}
      </div>
    </div>
  );
}
