import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const tipos = ['Conductual', 'Académica', 'Salud', 'Bullying', 'Daño a propiedad', 'Otro'];

export default function AuxIncidentsPage() {
  const { user } = useAuth();
  const [incidentType, setIncidentType] = useState('Conductual');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Patio');
  const [isViolent, setIsViolent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('La descripción es requerida.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/incidents', {
        incidentType,
        incidentDate: new Date().toISOString(),
        reporterName: user?.name || 'Auxiliar',
        description: description.trim(),
        location: location.trim() || 'Patio',
        actionsTaken: 'Registrado por auxiliar desde PWA',
        isViolent,
        status: 'Pendiente',
      });
      toast.success('Incidencia registrada.');
      setDescription('');
      setIsViolent(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar incidencia.');
    } finally {
      setLoading(false);
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
            <h1 className="text-lg font-semibold">Registro rápido</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lugar</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Ej. Patio, aula, comedor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Describe lo ocurrido"
            />
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold transition disabled:opacity-60"
          >
            {loading ? 'Registrando...' : 'Registrar incidencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
