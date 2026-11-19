import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function AuxLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(dni, password, '/aux');
    } catch (e) {
      // error ya mostrado por AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg mb-3">
            <UserCircleIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SIGES - Sistema de Gestión Escolar</h1>
          <p className="text-sm text-gray-500 mt-1">PWA Auxiliar · Acceso para auxiliares y directivos</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">DNI</label>
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="Número de DNI"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl py-3 font-semibold shadow-md active:scale-[0.98] transition disabled:opacity-60"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center">
            Usa tus credenciales del sistema principal.
          </p>
        </div>
      </div>
    </div>
  );
}
