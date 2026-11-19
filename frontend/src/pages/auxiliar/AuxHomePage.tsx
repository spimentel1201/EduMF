import { Link } from 'react-router-dom';
import { QrCodeIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export default function AuxHomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-6 pb-10 rounded-b-3xl shadow-lg">
        <p className="text-xs text-white/80">Bienvenido</p>
        <h1 className="text-xl font-semibold">{user?.name || 'Auxiliar'}</h1>
        <p className="text-sm text-white/80 mt-1">Toma de asistencia rápida</p>
      </div>

      <div className="px-4 -mt-8 space-y-4">
        <Link
          to="/aux/escanear"
          className="block bg-gradient-to-r from-[#538f65] to-[#2f5d3f] text-white rounded-3xl shadow-lg p-6 text-center active:scale-[0.98] transition"
        >
          <QrCodeIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-bold">Escanear asistencia</p>
          <p className="text-xs text-white/80 mt-1">Entrada / Salida</p>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/aux/asistencia" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 active:scale-[0.98] transition">
            <ClipboardDocumentListIcon className="w-7 h-7 text-emerald-600" />
            <p className="text-sm font-medium text-gray-800">Asistencia del día</p>
          </Link>
          <Link to="/aux/incidencias" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 active:scale-[0.98] transition">
            <ExclamationTriangleIcon className="w-7 h-7 text-amber-600" />
            <p className="text-sm font-medium text-gray-800">Incidencias</p>
          </Link>
          <Link to="/aux/perfil" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 active:scale-[0.98] transition col-span-2">
            <UserCircleIcon className="w-7 h-7 text-indigo-600" />
            <p className="text-sm font-medium text-gray-800">Perfil y configuración</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
