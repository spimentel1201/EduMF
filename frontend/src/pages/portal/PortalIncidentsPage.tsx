import { useEffect, useState } from 'react';
import { guardianApi } from '@/services/guardianApi';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const statusStyle: Record<string, string> = {
  Pendiente: 'bg-gray-100 text-gray-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  Resuelto: 'bg-emerald-100 text-emerald-700',
  Cerrado: 'bg-gray-200 text-gray-500',
};

const typeColor: Record<string, string> = {
  Conductual: 'bg-amber-100 text-amber-700',
  Académica: 'bg-blue-100 text-blue-700',
  Salud: 'bg-rose-100 text-rose-700',
  Bullying: 'bg-red-100 text-red-700',
  'Daño a propiedad': 'bg-orange-100 text-orange-700',
  Otro: 'bg-gray-100 text-gray-700',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Incidencias</p>
            <h1 className="text-lg font-semibold">Historial escolar</h1>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-3">{incidents.length} incidencia(s) registrada(s)</p>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {incidents.map((inc) => (
          <div key={inc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`h-1.5 ${inc.isViolent ? 'bg-red-500' : 'bg-amber-400'}`} />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColor[inc.incidentType] || 'bg-gray-100 text-gray-700'}`}>
                  {inc.incidentType}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[inc.status] || 'bg-gray-100 text-gray-600'}`}>
                  {inc.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(inc.incidentDate).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                {' · '}
                {inc.location}
              </p>
              <p className="text-sm text-gray-700">{inc.description}</p>
              {inc.isViolent && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Incidencia violenta
                </div>
              )}
              {inc.actionsTaken && (
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">Acciones tomadas</p>
                  <p className="text-xs text-gray-700 mt-0.5">{inc.actionsTaken}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {incidents.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
              <ExclamationTriangleIcon className="w-7 h-7 text-amber-400" />
            </div>
            <p className="text-gray-500 text-sm">Sin incidencias registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
