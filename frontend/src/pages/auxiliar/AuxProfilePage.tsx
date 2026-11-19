import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function AuxProfilePage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/update-password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <UserCircleIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Perfil</p>
            <h1 className="text-lg font-semibold">{user?.name || 'Auxiliar'}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm text-gray-500">DNI: <span className="text-gray-800 font-medium">{user?.dni || '—'}</span></p>
          <p className="text-sm text-gray-500">Rol: <span className="text-gray-800 font-medium">{user?.role}</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-medium text-gray-800">Cambiar contraseña</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 font-medium transition disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

        <button
          onClick={logout}
          className="w-full border border-gray-200 rounded-xl py-2.5 text-gray-600 hover:bg-gray-50 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
