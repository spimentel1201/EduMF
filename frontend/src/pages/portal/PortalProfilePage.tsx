import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guardianApi, setGuardianToken } from '@/services/guardianApi';

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
      setPushStatus('Contraseña actualizada.');
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
    navigate('/portal');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Perfil</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="font-medium">{guardian?.nombres}</p>
        <p className="text-sm text-gray-500">Login: {guardian?.loginId}</p>
        <p className="text-sm text-gray-500">Teléfono: {guardian?.telefono || '—'}</p>
        <p className="text-sm text-gray-500">Email: {guardian?.email || '—'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-medium">Cambiar contraseña</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <input
            type="password"
            placeholder="Contraseña actual (si ya la cambió)"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2"
          />
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#538f65] text-white rounded-lg py-2 font-medium"
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-medium">Notificaciones</h2>
        <button
          onClick={handlePushSubscribe}
          className="w-full bg-[#538f65] text-white rounded-lg py-2 font-medium"
        >
          Activar notificaciones
        </button>
        {pushStatus && <p className="text-sm text-gray-600">{pushStatus}</p>}
      </div>

      <button
        onClick={handleLogout}
        className="w-full border border-gray-200 rounded-lg py-2 text-gray-600"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
