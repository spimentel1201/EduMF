import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';

const statusColor: Record<string, string> = {
  Pendiente: 'bg-gray-100 text-gray-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  Resuelto: 'bg-green-100 text-green-700',
  Cerrado: 'bg-gray-200 text-gray-500',
};

export default function PortalIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await guardianApi.get('/guardians/children/incidents');
        setIncidents(res.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Incidencias</h1>
      {incidents.map((inc) => (
        <div key={inc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{inc.incidentType}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColor[inc.status] || 'bg-gray-100'}`}>
              {inc.status}
            </span>
          </div>
          <p className="text-xs text-gray-500">{new Date(inc.incidentDate).toLocaleDateString('es-PE')} · {inc.location}</p>
          <p className="text-sm text-gray-700">{inc.description}</p>
          {inc.isViolent && <p className="text-xs text-red-600 font-medium">Incidencia violenta</p>}
          {inc.actionsTaken && <p className="text-xs text-gray-500">Acciones: {inc.actionsTaken}</p>}
        </div>
      ))}
      {incidents.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
          Sin incidencias registradas.
        </div>
      )}
    </div>
  );
}
