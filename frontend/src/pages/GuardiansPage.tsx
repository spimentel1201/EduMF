import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';

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
    try {
      const res = await api.post('/guardians/import', { dryRun: false });
      toast.success(`Importación: ${res.data.data.creados} creados, ${res.data.data.actualizados} actualizados.`);
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al importar tutores.');
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tutores / Apoderados</h1>
        <button onClick={importar} className="bg-[#538f65] text-white rounded-lg px-4 py-2 text-sm">
          Importar desde alumnos
        </button>
      </div>
      {loading && <p className="text-gray-500">Cargando...</p>}
      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 px-3">Login</th>
              <th className="py-2 px-3">Nombre</th>
              <th className="py-2 px-3">Teléfono</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3">Clave personalizada</th>
              <th className="py-2 px-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {guardians.map((g) => (
              <tr key={g.id} className="border-t border-gray-100">
                <td className="py-2 px-3">{g.loginId}</td>
                <td className="py-2 px-3">{g.nombres}</td>
                <td className="py-2 px-3">{g.telefono || '—'}</td>
                <td className="py-2 px-3">{g.status}</td>
                <td className="py-2 px-3">{g.hasCustomPassword ? 'Sí' : 'No'}</td>
                <td className="py-2 px-3">
                  <button onClick={() => resetear(g)} className="text-[#538f65] underline">
                    Resetear clave
                  </button>
                </td>
              </tr>
            ))}
            {guardians.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-4 text-center text-gray-400">Sin tutores.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
