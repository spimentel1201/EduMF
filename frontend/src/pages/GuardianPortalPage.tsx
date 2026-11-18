import { useEffect, useState } from 'react';
import { guardianApi, setGuardianToken } from '@/services/guardianApi';

interface GuardianInfo {
  id: string;
  loginId: string;
  nombres: string;
  telefono?: string;
  email?: string;
  hasCustomPassword?: boolean;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  dni?: string;
}

interface AttendanceDetail {
  fecha: string;
  status: string;
  horaEntrada?: string;
  horaSalida?: string;
}

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
  const [guardian, setGuardian] = useState<GuardianInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceDetail[]>>({});
  const [pushStatus, setPushStatus] = useState<string>('');

  const cargarDatos = async () => {
    try {
      const me = await guardianApi.get('/guardians/me');
      setGuardian(me.data.data.guardian);
      setStudents(me.data.data.students || []);
      const att = await guardianApi.get('/guardians/children/attendance');
      setAttendance(att.data.data || {});
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar la información.');
      setGuardianToken(null);
      setToken(null);
    }
  };

  useEffect(() => {
    if (token) cargarDatos();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await guardianApi.post('/guardians/login', { loginId, password });
      const t = res.data.data.token;
      setGuardianToken(t);
      setToken(t);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setGuardianToken(null);
    setToken(null);
    setGuardian(null);
    setStudents([]);
    setAttendance({});
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
              <label className="block text-sm text-gray-600 mb-1">Contraseña (inicial: su identificador)</label>
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
          <p className="text-xs text-gray-500 mt-4">{/* aviso de privacidad se carga desde settings */}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Hola, {guardian?.nombres}</h1>
            <p className="text-sm text-gray-500">Portal de asistencia</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-600 underline">Salir</button>
        </div>

        <div className="mb-4">
          <button
            onClick={handlePushSubscribe}
            className="bg-[#538f65] text-white rounded-lg px-4 py-2 text-sm"
          >
            Activar notificaciones
          </button>
          {pushStatus && <span className="ml-3 text-sm text-gray-600">{pushStatus}</span>}
        </div>

        {students.map((st) => (
          <div key={st._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <h2 className="font-semibold">{st.firstName} {st.lastName}</h2>
            <p className="text-sm text-gray-500">DNI: {st.dni || '—'}</p>
            <div className="mt-3">
              <h3 className="text-sm font-medium mb-2">Asistencia reciente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1">Fecha</th>
                      <th className="py-1">Estado</th>
                      <th className="py-1">Entrada</th>
                      <th className="py-1">Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendance[st._id] || []).map((d, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="py-1">{new Date(d.fecha).toLocaleDateString('es-PE')}</td>
                        <td className="py-1">{d.status}</td>
                        <td className="py-1">{d.horaEntrada ? new Date(d.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-1">{d.horaSalida ? new Date(d.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    ))}
                    {(attendance[st._id] || []).length === 0 && (
                      <tr><td colSpan={4} className="py-2 text-gray-400">Sin registros recientes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
