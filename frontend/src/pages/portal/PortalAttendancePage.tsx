import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const statusStyle: Record<string, string> = {
  Presente: 'bg-emerald-100 text-emerald-700',
  Tardanza: 'bg-amber-100 text-amber-700',
  Ausente: 'bg-rose-100 text-rose-700',
  Justificado: 'bg-blue-100 text-blue-700',
};

export default function PortalAttendancePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, attRes] = await Promise.all([
          guardianApi.get('/guardians/me'),
          guardianApi.get('/guardians/children/attendance'),
        ]);
        const sts = meRes.data.data.students || [];
        setStudents(sts);
        setAttendance(attRes.data.data || {});
        if (sts.length > 0) setSelected(sts[0]._id);
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
        <div className="w-10 h-10 rounded-full border-4 border-[#538f65] border-t-transparent animate-spin" />
      </div>
    );
  }

  const rows = attendance[selected] || [];
  const selectedStudent = students.find((s) => s._id === selected);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <CalendarDaysIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Asistencia</p>
            <h1 className="text-lg font-semibold">Historial reciente</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {students.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2 overflow-x-auto">
            {students.map((st) => (
              <button
                key={st._id}
                onClick={() => setSelected(st._id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  selected === st._id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st.firstName}
              </button>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm text-gray-500">Mostrando registros de</p>
            <p className="font-semibold text-gray-800">{selectedStudent.firstName} {selectedStudent.lastName}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-medium text-gray-800">Registros</p>
            <span className="text-xs text-gray-500">{rows.length} días</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map((r, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{new Date(r.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.horaEntrada ? `Entrada ${new Date(r.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : 'Sin entrada'}
                    {r.horaSalida ? ` · Salida ${new Date(r.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[r.status] || 'bg-gray-100 text-gray-600'}`}>
                  {r.status}
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Sin registros recientes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
