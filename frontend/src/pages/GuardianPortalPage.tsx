import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { guardianApi, setGuardianToken } from '@/services/guardianApi';
import BottomNav from '@/components/portal/BottomNav';

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
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-xl font-semibold mb-4">Portal de Padres - SIGES</h1>
          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Identificador de acceso</label>
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
                placeholder="DNI / código / teléfono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#538f65] text-white rounded-lg py-2 font-medium"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
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

export { urlBase64ToUint8Array };
