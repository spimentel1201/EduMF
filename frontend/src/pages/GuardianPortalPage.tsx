import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { guardianApi, setGuardianToken } from '@/services/guardianApi';
import BottomNav from '@/components/portal/BottomNav';
import { UserCircleIcon } from '@heroicons/react/24/outline';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function GuardianPortalPage() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('guardianToken'));
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // no-op: token state already initialized
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await guardianApi.post('/guardians/login', { loginId, password });
      const t = res.data?.data?.token;
      if (!t) throw new Error('Token no recibido');
      setGuardianToken(t);
      setToken(t);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setGuardianToken(null);
    setToken(null);
    navigate('/portal');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#538f65]/15 via-gray-50 to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#538f65] to-[#2f5d3f] flex items-center justify-center shadow-lg mb-3">
              <UserCircleIcon className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">SIGES - Sistema de Gestión Escolar</h1>
            <p className="text-sm text-gray-500 mt-1">Portal de Padres · Acceso para tutores</p>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Identificador de acceso</label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#538f65] transition"
                  placeholder="DNI / código / teléfono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#538f65] transition"
                  placeholder="Tu clave de acceso"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#538f65] to-[#2f5d3f] text-white rounded-xl py-3 font-semibold shadow-md active:scale-[0.98] transition disabled:opacity-60"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center">
              Usa tu identificador como contraseña inicial.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Outlet context={{ handleLogout }} />
      <BottomNav />
    </div>
  );
}

// urlBase64ToUint8Array is defined locally and not exported to keep Fast Refresh working.
