import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guardianApi, setGuardianToken } from '@/services/guardianApi';
import { UserCircleIcon, BellIcon } from '@heroicons/react/24/outline';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PortalProfilePage() {
  const navigate = useNavigate();
  const [guardian, setGuardian] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pushStatus, setPushStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await guardianApi.get('/guardians/me');
        setGuardian(res.data.data.guardian);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await guardianApi.put('/guardians/update-password', { currentPassword, newPassword });
      setPushStatus('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setPushStatus(e?.response?.data?.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handlePushSubscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('Este navegador no soporta notificaciones push.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('Permiso de notificaciones denegado.');
        return;
      }
      const vapidRes = await guardianApi.get('/push-subscriptions/vapid-public-key');
      const publicKey = vapidRes.data.data.publicKey;
      const reg = await navigator.serviceWorker.register('/sw.js');
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await guardianApi.post('/push-subscriptions/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
        deviceLabel: 'PWA',
      });
      setPushStatus('Notificaciones activadas correctamente.');
    } catch (e: any) {
      setPushStatus(e?.response?.data?.message || e?.message || 'Error al suscribirse.');
    }
  };

  const handleLogout = () => {
    setGuardianToken(null);
    window.location.href = '/portal';
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
            <h1 className="text-lg font-semibold">{guardian?.nombres || 'Tutor'}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm text-gray-500">Login: <span className="text-gray-800 font-medium">{guardian?.loginId}</span></p>
          <p className="text-sm text-gray-500">Teléfono: <span className="text-gray-800 font-medium">{guardian?.telefono || '—'}</span></p>
          <p className="text-sm text-gray-500">Email: <span className="text-gray-800 font-medium">{guardian?.email || '—'}</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-medium text-gray-800">Cambiar contraseña</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
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
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 font-medium transition"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-indigo-500" />
            <h2 className="font-medium text-gray-800">Notificaciones</h2>
          </div>
          <button
            onClick={handlePushSubscribe}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 font-medium transition"
          >
            Activar notificaciones
          </button>
          {pushStatus && <p className="text-sm text-gray-600">{pushStatus}</p>}
        </div>

        <button
          onClick={handleLogout}
          className="w-full border border-gray-200 rounded-xl py-2.5 text-gray-600 hover:bg-gray-50 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
