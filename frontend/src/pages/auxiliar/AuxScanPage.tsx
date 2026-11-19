import { useState } from 'react';
import { attendanceService } from '@/services/attendanceService';
import { QrCodeIcon } from '@heroicons/react/24/outline';

export default function AuxScanPage() {
  const [dni, setDni] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const escanear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await attendanceService.qrScan(dni.trim(), tipo);
      setResult(data);
      setDni('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo registrar la asistencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <QrCodeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/80">Asistencia</p>
            <h1 className="text-lg font-semibold">Escanear</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTipo('entrada')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${tipo === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Entrada
            </button>
            <button
              onClick={() => setTipo('salida')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${tipo === 'salida' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Salida
            </button>
          </div>

          <form onSubmit={escanear} className="space-y-3">
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="DNI del estudiante"
              inputMode="numeric"
            />
            <button
              type="submit"
              disabled={loading || !dni.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 font-semibold transition disabled:opacity-60"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <QrCodeIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{result.studentName}</p>
                <p className="text-xs text-gray-500">DNI: {result.dni}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm text-gray-600">Estado</span>
              <span className="text-sm font-semibold text-gray-800">{result.status}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm text-gray-600">Hora</span>
              <span className="text-sm font-semibold text-gray-800">
                {new Date(result.time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {result.mensaje && <p className="text-xs text-amber-600">{result.mensaje}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
