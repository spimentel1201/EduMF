import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';

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

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>;

  const rows = attendance[selected] || [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Asistencia</h1>
      {students.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {students.map((st) => (
            <button
              key={st._id}
              onClick={() => setSelected(st._id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                selected === st._id ? 'bg-[#538f65] text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {st.firstName}
            </button>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3">Entrada</th>
              <th className="py-2 px-3">Salida</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-gray-100">
                <td className="py-2 px-3">{new Date(r.fecha).toLocaleDateString('es-PE')}</td>
                <td className="py-2 px-3">{r.status}</td>
                <td className="py-2 px-3">{r.horaEntrada ? new Date(r.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="py-2 px-3">{r.horaSalida ? new Date(r.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin registros recientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
