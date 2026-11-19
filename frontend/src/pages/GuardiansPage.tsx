import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import {
  UsersIcon,
  ArrowPathIcon,
  KeyIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Guardian {
  id: string;
  loginId: string;
  nombres: string;
  telefono?: string;
  email?: string;
  status: string;
  hasCustomPassword: boolean;
  students?: string[];
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get('/guardians');
      setGuardians(res.data.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo cargar tutores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const importar = async () => {
    setImporting(true);
    try {
      const res = await api.post('/guardians/import', { dryRun: false });
      toast.success(`Importación: ${res.data.data.creados} creados, ${res.data.data.actualizados} actualizados.`);
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al importar tutores.');
    } finally {
      setImporting(false);
    }
  };

  const resetear = async (g: Guardian) => {
    const nueva = window.prompt(`Nueva contraseña para ${g.loginId} (vacío = restablecer a clave inicial):`);
    if (nueva === null) return;
    try {
      await api.put(`/guardians/${g.id}/reset-password`, { newPassword: nueva.trim() });
      toast.success(nueva.trim() ? 'Contraseña actualizada.' : 'Contraseña restablecida a la clave inicial.');
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al restablecer contraseña.');
    }
  };

  const total = guardians.length;
  const conClave = guardians.filter((g) => g.hasCustomPassword).length;
  const sinClave = total - conClave;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80">Administración</p>
              <h1 className="text-lg font-semibold">Tutores / Apoderados</h1>
            </div>
          </div>
          <button
            onClick={importar}
            disabled={importing}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-xl transition disabled:opacity-60"
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Total</p>
            <p className="text-xl font-bold">{total}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Con clave</p>
            <p className="text-xl font-bold">{conClave}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Clave inicial</p>
            <p className="text-xl font-bold">{sinClave}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-medium text-gray-800">Listado de tutores</p>
            <button
              onClick={cargar}
              className="text-[#538f65] text-sm font-medium flex items-center gap-1"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
          ) : guardians.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                <UsersIcon className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-gray-500 text-sm">Sin tutores registrados.</p>
              <p className="text-xs text-gray-400 mt-1">Importa desde alumnos para comenzar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {guardians.map((g) => (
                <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{g.nombres}</p>
                    <p className="text-xs text-gray-500 truncate">
                      Login: {g.loginId}
                      {g.telefono ? ` · ${g.telefono}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${g.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {g.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                      {g.hasCustomPassword ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          Clave personalizada
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Clave inicial
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => resetear(g)}
                    className="shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <KeyIcon className="w-3.5 h-3.5" />
                    Resetear
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
