import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { guardianApi } from '@/services/guardianApi';

export default function PortalHomePage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [incidents, setIncidents] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, attRes, incRes, debtRes, msgRes] = await Promise.all([
          guardianApi.get('/guardians/me'),
          guardianApi.get('/guardians/children/attendance'),
          guardianApi.get('/guardians/children/incidents'),
          guardianApi.get('/guardians/children/debts'),
          guardianApi.get('/guardian-messages'),
        ]);
        setGuardian(meRes.data.data.guardian);
        setStudents(meRes.data.data.students || []);
        setAttendance(attRes.data.data || {});
        setIncidents(incRes.data.data || []);
        setDebts(debtRes.data.data || []);
        setMessages(msgRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#538f65] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  const openIncidents = incidents.filter((i) => i.status !== 'Cerrado' && i.status !== 'Resuelto').length;
  const totalDebt = debts.reduce((acc, d) => acc + (parseFloat(d?.totalDebt) || 0), 0);
  const unreadMessages = messages.filter((m) => !m.readBy?.length).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#538f65]/10 via-gray-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#538f65] to-[#2f5d3f] text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <UserCircleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80">Bienvenido</p>
              <h1 className="text-lg font-semibold leading-tight">{guardian?.nombres || 'Tutor'}</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
            <BellIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Hijos</p>
            <p className="text-xl font-bold">{students.length}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Incidencias abiertas</p>
            <p className="text-xl font-bold">{openIncidents}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <p className="text-[11px] text-white/80">Deuda total</p>
            <p className="text-xl font-bold">S/ {totalDebt.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/portal/asistencia"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Asistencia</p>
              <p className="text-xs text-gray-500">Historial reciente</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/portal/incidencias"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Incidencias</p>
              <p className="text-xs text-gray-500">{openIncidents} abiertas</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/portal/pagos"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
              <CreditCardIcon className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Pagos</p>
              <p className="text-xs text-gray-500">S/ {totalDebt.toFixed(2)} pendiente</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/portal/perfil"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Perfil</p>
              <p className="text-xs text-gray-500">Configuración</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/portal/comunicados"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-sky-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Comunicados {unreadMessages > 0 ? `(${unreadMessages})` : ''}</p>
              <p className="text-xs text-gray-500">Mensajes y avisos</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </Link>
        </div>

        {/* Children cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Tus hijos</h2>
          {students.map((st) => {
            const att = attendance[st._id] || [];
            const last = att[0];
            const studentDebts = debts.find((d) => d?.student?.id === st._id);
            const pending = studentDebts?.totalDebt || '0.00';
            const studentIncidents = incidents.filter(
              (i) => String(i.victimId?._id || i.victimId) === st._id || String(i.aggressorId?._id || i.aggressorId) === st._id
            );
            const hasDebt = parseFloat(pending) > 0;
            return (
              <div
                key={st._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className={`h-1.5 ${hasDebt ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{st.firstName} {st.lastName}</h3>
                      <p className="text-xs text-gray-500">DNI: {st.dni || '—'}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasDebt ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                      <UserCircleIcon className={`w-6 h-6 ${hasDebt ? 'text-rose-500' : 'text-emerald-500'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Asistencia</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{last ? last.status : '—'}</p>
                      <p className="text-[10px] text-gray-400">{last ? new Date(last.fecha).toLocaleDateString('es-PE') : ''}</p>
                      {last && (last.horaEntrada || last.horaSalida) && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {last.horaEntrada ? `Entrada ${new Date(last.horaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          {last.horaEntrada && last.horaSalida ? ' · ' : ''}
                          {last.horaSalida ? `Salida ${new Date(last.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Incidencias</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{studentIncidents.length}</p>
                      <p className="text-[10px] text-gray-400">registradas</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Deuda</p>
                      <p className={`text-sm font-semibold mt-0.5 ${hasDebt ? 'text-rose-600' : 'text-emerald-600'}`}>S/ {pending}</p>
                      <p className="text-[10px] text-gray-400">{hasDebt ? 'pendiente' : 'al día'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {students.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
              No hay estudiantes vinculados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
