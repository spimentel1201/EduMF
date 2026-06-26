import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  QrCodeIcon,
  ClockIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import QrReader from 'react-qr-reader-es6';
import { attendanceService } from '@/services/attendanceService';

const ALLOWED_ROLES = ['Auxiliar', 'admin', 'Dirección'];

interface AttendanceNotification {
  studentName: string;
  status: 'Presente' | 'Tardanza';
  time: string;
  type: 'success' | 'error';
  message?: string;
}

export default function TakeAttendancePage() {
  const { user } = useAuth();
  
  const [isScanning, setIsScanning] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [notification, setNotification] = useState<AttendanceNotification | null>(null);
  const [processing, setProcessing] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/attendance" replace />;
  }

  const handleQRScan = async (data: string | null) => {
    if (!data || processing) return;

    // Debounce: ignore same QR within 8 seconds
    if (lastScannedRef.current === data) return;
    lastScannedRef.current = data;
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => { lastScannedRef.current = null; }, 8000);

    setProcessing(true);
    try {
      const result = await attendanceService.qrScan(data.trim());
      setNotification({
        studentName: result.studentName,
        status: result.status,
        time: new Date(result.time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'success',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'No se pudo registrar la asistencia';
      setNotification({
        studentName: '',
        status: 'Presente',
        time: '',
        type: 'error',
        message: msg,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (isScanning) {
    return (
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto mt-6">
        {/* Scanner panel */}
        <div className="flex-1 rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 bg-white">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Escáner QR</h2>
            <p className="text-sm text-gray-500 mt-1">Acerca el código QR del estudiante a la cámara</p>
          </div>

          <div className="rounded-xl overflow-hidden border-2 border-primary-200 relative max-w-md mx-auto">
            <QrReader
              onScan={handleQRScan}
              onError={(err: any) => console.error('QR error:', err)}
              style={{ width: '100%' }}
              showViewFinder
              delay={500}
              facingMode="environment"
            />
            {processing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsScanning(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors max-w-md mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver
          </button>
        </div>

        {/* Info + notification panel */}
        <div className="flex flex-col w-full md:w-80 gap-4">
          {/* Clock */}
          <div className="rounded-2xl shadow-sm border border-gray-100 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-semibold text-gray-700">Hora actual</span>
            </div>
            <div className="text-center bg-primary-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-primary-800 tabular-nums">
                {currentDateTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-primary-600 mt-1 capitalize">
                {currentDateTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Notification */}
          {notification ? (
            <div className={`rounded-2xl shadow-sm border p-5 bg-white transition-all duration-300 ${notification.type === 'success' ? 'border-green-200' : 'border-red-200'}`}>
              {notification.type === 'success' ? (
                <>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-center text-sm font-bold text-gray-900 mb-1">Asistencia registrada</h3>
                  <p className="text-center text-base font-bold text-green-700 mb-2">{notification.studentName}</p>
                  <div className={`text-center text-xs font-semibold px-3 py-1 rounded-full inline-block w-full ${notification.status === 'Presente' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {notification.status}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">{notification.time}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-center text-sm font-bold text-gray-900 mb-1">No se pudo registrar</h3>
                  <p className="text-center text-xs text-red-600">{notification.message}</p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl shadow-sm border border-gray-100 p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Instrucciones</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  Muestra el código QR del carnet estudiantil
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  Acércalo a la cámara
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  Espera la confirmación en pantalla
                </li>
              </ul>
              <p className="text-xs text-gray-400 mt-3">
                Antes de las 08:10 → <strong>Presente</strong><br />
                Después de las 08:10 → <strong>Tardanza</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Tomar Asistencia</h3>
          <p className="mt-2 max-w-4xl text-sm text-gray-500">
            Registra la asistencia diaria mediante el escaneo de códigos QR.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-2xl p-8 max-w-lg mx-auto text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mx-auto">
          <QrCodeIcon className="w-10 h-10 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Escáner de Carnets QR</h3>
          <p className="text-gray-500 text-sm">
            Inicia el escáner para registrar rápidamente la asistencia de los estudiantes usando sus carnets institucionales.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setIsScanning(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all"
        >
          <QrCodeIcon className="h-6 w-6" />
          Iniciar Escáner QR
        </button>
      </div>
    </div>
  );
}

