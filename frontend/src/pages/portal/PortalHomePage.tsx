import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { guardianApi } from '@/services/guardianApi';

export default function PortalHomePage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [incidents, setIncidents] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, attRes, incRes, debtRes] = await Promise.all([
          guardianApi.get('/guardians/me'),
          guardianApi.get('/guardians/children/attendance'),
          guardianApi.get('/guardians/children/incidents'),
          guardianApi.get('/guardians/children/debts'),
        ]);
        setGuardian(meRes.data.data.guardian);
        setStudents(meRes.data.data.students || []);
        setAttendance(attRes.data.data || {});
        setIncidents(incRes.data.data || []);
        setDebts(debtRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-500">Cargando...</div>;
  }

  const openIncidents = incidents.filter((i) => i.status !== 'Cerrado' && i.status !== 'Resuelto').length;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Hola, {guardian?.nombres}</h1>
        <p className="text-sm text-gray-500">Resumen de tus hijos</p>
      </div>

      {students.map((st) => {
        const att = attendance[st._id] || [];
        const last = att[0];
        const studentDebts = debts.find((d) => d?.student?.id === st._id);
        const pending = studentDebts?.totalDebt || '0.00';
        const studentIncidents = incidents.filter(
          (i) => String(i.victimId?._id || i.victimId) === st._id || String(i.aggressorId?._id || i.aggressorId) === st._id
        );
        return (
          <div key={st._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{st.firstName} {st.lastName}</h2>
                <p className="text-xs text-gray-500">DNI: {st.dni || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Última asistencia</p>
                <p className="text-sm font-medium">{last ? new Date(last.fecha).toLocaleDateString('es-PE') : '—'}</p>
                <p className="text-xs text-gray-600">{last?.status || ''}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Incidencias</p>
                <p className="text-sm font-medium">{studentIncidents.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Deuda</p>
                <p className="text-sm font-medium">S/ {pending}</p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/asistencia" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="font-medium">Asistencia</p>
        </Link>
        <Link to="/portal/incidencias" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="font-medium">Incidencias {openIncidents > 0 ? `(${openIncidents})` : ''}</p>
        </Link>
        <Link to="/portal/pagos" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="font-medium">Pagos</p>
        </Link>
        <Link to="/portal/perfil" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="font-medium">Perfil</p>
        </Link>
      </div>
    </div>
  );
}
