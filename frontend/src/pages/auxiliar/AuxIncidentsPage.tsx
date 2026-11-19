import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import StudentSearch from '@/components/StudentSearch';
import EvidenceUploader from '@/components/EvidenceUploader';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const tipos = ['Conductual', 'Académica', 'Salud', 'Bullying', 'Daño a propiedad', 'Otro'];
const estados = ['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'];

export default function AuxIncidentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'registrar' | 'listado'>('registrar');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  // Form state
  const [incidentType, setIncidentType] = useState('Conductual');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [victimId, setVictimId] = useState('');
  const [aggressorId, setAggressorId] = useState('');
  const [isViolent, setIsViolent] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Patio');
  const [actionsTaken, setActionsTaken] = useState('Registrado por auxiliar desde PWA');
  const [status, setStatus] = useState('Pendiente');
  const [evidenceBase64, setEvidenceBase64] = useState<string | undefined>(undefined);

  const cargarIncidencias = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo cargar incidencias.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'listado') cargarIncidencias();
  }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !location.trim() || !actionsTaken.trim()) {
      toast.error('Completa los campos requeridos.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/incidents', {
        incidentType,
        incidentDate: new Date(incidentDate).toISOString(),
        reporterName: user?.name || 'Auxiliar',
        victimId: victimId || undefined,
        aggressorId: aggressorId || undefined,
        isViolent,
        description: description.trim(),
        location: location.trim(),
        actionsTaken: actionsTaken.trim(),
        evidenceBase64,
        status,
      });
      toast.success('Incidencia registrada.');
      // reset
      setDescription('');
      setVictimId('');
      setAggressorId('');
      setIsViolent(false);
      setEvidenceBase64(undefined);
      setActionsTaken('Registrado por auxiliar desde PWA');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar incidencia.');
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: string, nuevo: string) => {
    try {
      await api.patch(`/incidents/${id}/status`, { status: nuevo });
      toast.success('Estado actualizado.');
      cargarIncidencias();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar estado.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Incidencias</p>
            <h1 className="text-lg font-semibold">Gestión rápida</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1 flex">
          <button
            onClick={() => setTab('registrar')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === 'registrar' ? 'bg-amber-500 text-white' : 'text-gray-600'}`}
          >
            Registrar
          </button>
          <button
            onClick={() => setTab('listado')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === 'listado' ? 'bg-amber-500 text-white' : 'text-gray-600'}`}
          >
            Listado
          </button>
        </div>

        {tab === 'registrar' && (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <StudentSearch label="Víctima (agredido)" value={victimId} onChange={setVictimId} />
            <StudentSearch label="Agresor (opcional)" value={aggressorId} onChange={setAggressorId} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lugar</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Acciones tomadas</label>
              <textarea
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {estados.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isViolent}
                onChange={(e) => setIsViolent(e.target.checked)}
                className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              />
              Incidencia violenta
            </label>

            <EvidenceUploader value={evidenceBase64} onChange={setEvidenceBase64} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold transition disabled:opacity-60"
            >
              {loading ? 'Registrando...' : 'Registrar incidencia'}
            </button>
          </form>
        )}

        {tab === 'listado' && (
          <div className="space-y-3">
            {listLoading && <div className="text-center text-gray-400 text-sm py-6">Cargando...</div>}
            {!listLoading && incidents.map((inc) => (
              <div key={inc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{inc.incidentType}</span>
                  <select
                    value={inc.status}
                    onChange={(e) => cambiarEstado(inc.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 max-w-[120px]"
                  >
                    {estados.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(inc.incidentDate).toLocaleDateString('es-PE')} · {inc.location}
                </p>
                <p className="text-sm text-gray-700">{inc.description}</p>
                {inc.isViolent && <p className="text-xs text-red-600 font-medium">Incidencia violenta</p>}
                {inc.evidenceBase64 && (
                  <img src={inc.evidenceBase64} alt="Evidencia" className="w-full max-h-32 object-contain rounded-lg border border-gray-200" />
                )}
              </div>
            ))}
            {!listLoading && incidents.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
                Sin incidencias registradas.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
