import { useRef, useState } from 'react';
import { attendanceService } from '@/services/attendanceService';
import QrReader from 'react-qr-reader-es6';
import { QrCodeIcon } from '@heroicons/react/24/outline';

export default function AuxScanPage() {
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScan = async (data: string | null) => {
    if (!data || processing) return;

    if (lastScannedRef.current === data) return;
    lastScannedRef.current = data;
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => { lastScannedRef.current = null; }, 2000);

    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await attendanceService.qrScan(data.trim(), tipo);
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo registrar la asistencia.');
    } finally {
      setProcessing(false);
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
            <h1 className="text-lg font-semibold">Escanear QR</h1>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
          <div className="flex gap-2 mb-3">
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

          <div className="rounded-xl overflow-hidden border-2 border-emerald-200 relative">
            <QrReader
              onScan={handleScan}
              onError={(err: any) => console.error('QR error:', err)}
              style={{ width: '100%' }}
              showViewFinder
              delay={100}
              facingMode="environment"
            />
            {processing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <p className="font-semibold text-gray-800">{result.studentName}</p>
            <p className="text-xs text-gray-500">DNI: {result.dni}</p>
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
