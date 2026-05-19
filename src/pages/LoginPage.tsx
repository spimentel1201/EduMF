import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  EyeSlashIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserIcon,
  LockClosedIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import QrReader from 'react-qr-reader-es6';
import { attendanceService } from '@/services/attendanceService';
import { t as tGlobal } from 'i18next';

const loginSchema = z.object({
  dni:      z.string().min(8, tGlobal('login.dniMinLength')),
  password: z.string().min(6, tGlobal('login.passwordMinLength')),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface AttendanceNotification {
  studentName: string;
  status: 'Presente' | 'Tardanza';
  time: string;
  type: 'success' | 'error';
  message?: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword]   = useState(false);
  const [activeTab, setActiveTab]         = useState<'dni' | 'qr'>('dni');
  const [isScanning, setIsScanning]       = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [notification, setNotification]   = useState<AttendanceNotification | null>(null);
  const [processing, setProcessing]       = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { login, isLoading } = useAuth();
  const { t } = useTranslation();

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.dni, data.password, '/');
    } catch {
      // error handled by AuthContext toast
    }
  };

  const handleQRScan = async (data: string | null) => {
    if (!data || processing) return;

    // Debounce: ignore same QR within 8 seconds
    if (lastScannedRef.current === data) return;
    lastScannedRef.current = data;
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => { lastScannedRef.current = null; }, 8000);

    setProcessing(true);
    try {
      // The QR content is the student's DNI
      const result = await attendanceService.qrScan(data.trim());
      setNotification({
        studentName: result.studentName,
        status:      result.status,
        time:        new Date(result.time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type:        'success',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'No se pudo registrar la asistencia';
      setNotification({
        studentName: '',
        status:      'Presente',
        time:        '',
        type:        'error',
        message:     msg,
      });
    } finally {
      setProcessing(false);
    }
  };

  // ── QR Scanner full-screen view ──────────────────────────────────────────
  if (isScanning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4">
        <div className="flex w-full max-w-4xl gap-6">

          {/* Scanner panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Registro de Asistencia por QR</h2>
              <p className="text-sm text-gray-500 mt-1">Acerca el código QR del estudiante a la cámara</p>
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-green-200 relative">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Volver al inicio
            </button>
          </div>

          {/* Info + notification panel */}
          <div className="hidden md:flex md:flex-col md:w-80 gap-4">

            {/* Clock */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Hora actual</span>
              </div>
              <div className="text-center bg-green-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-800 tabular-nums">
                  {currentDateTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-xs text-green-600 mt-1 capitalize">
                  {currentDateTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Notification */}
            {notification ? (
              <div className={`bg-white rounded-2xl shadow-sm border p-5 transition-all ${
                notification.type === 'success' ? 'border-green-200' : 'border-red-200'
              }`}>
                {notification.type === 'success' ? (
                  <>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-center text-sm font-bold text-gray-900 mb-1">Asistencia registrada</h3>
                    <p className="text-center text-base font-bold text-green-700 mb-2">{notification.studentName}</p>
                    <div className={`text-center text-xs font-semibold px-3 py-1 rounded-full inline-block w-full ${
                      notification.status === 'Presente'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Instrucciones</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    Muestra el código QR de tu carnet estudiantil
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    Acércalo a la cámara hasta que se detecte
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    Espera la confirmación en pantalla
                  </li>
                </ul>
                <p className="text-xs text-gray-400 mt-3">
                  Antes de las 08:10 → <strong>Presente</strong><br/>
                  Después de las 08:10 → <strong>Tardanza</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main login page ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex w-full">
      {/* Left — illustration */}
      <div className="hidden lg:flex flex-col lg:w-[55%] relative bg-gradient-to-r from-[#1fa1fd] to-[#f49342] overflow-hidden">
        <div className="absolute top-16 left-16 z-20">
          <h1 className="text-white text-6xl font-black leading-tight drop-shadow-md">
            Empoderando tu<br/>futuro educativo
          </h1>
        </div>
        <div
          className="absolute top-44 inset-x-0 bottom-0 bg-cover bg-top bg-no-repeat"
          style={{ backgroundImage: "url('/login-illustration.png')" }}
        />
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center bg-white px-8 sm:px-12 py-12 relative">
        <div className="max-w-md w-full">

          <div className="flex flex-col items-center">
            <div className="flex items-center text-blue-900 text-3xl font-bold mb-6">
              <span className="text-[#1fa1fd] text-5xl mr-2 font-black">E</span>
              EduMF
            </div>
            <h2 className="text-center text-[22px] font-bold text-gray-900">
              {t('login.title') || 'Bienvenido a EduMF'}
            </h2>
          </div>

          <div className="mt-8">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 w-full mb-8">
              {(['dni', 'qr'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 font-medium text-sm text-center focus:outline-none transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-[#1fa1fd] text-[#1fa1fd]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'dni' ? (t('login.loginTab') || 'Iniciar Sesión') : (t('login.qrTab') || 'QR Asistencia')}
                </button>
              ))}
            </div>

            {/* DNI login */}
            {activeTab === 'dni' && (
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                      {t('login.dniLabel') || 'DNI'}
                    </label>
                    <div className="relative rounded-full shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="dni"
                        type="text"
                        autoComplete="username"
                        className="appearance-none block w-full pl-11 pr-3 py-3 border border-blue-200 rounded-full bg-[#f0f8ff] placeholder-gray-400 focus:outline-none focus:ring-[#1fa1fd] focus:border-[#1fa1fd] sm:text-sm"
                        {...register('dni')}
                      />
                    </div>
                    {errors.dni && <p className="mt-1 text-sm text-red-600 ml-4">{errors.dni.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                      {t('login.passwordLabel') || 'Contraseña'}
                    </label>
                    <div className="relative rounded-full shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="appearance-none block w-full pl-11 pr-10 py-3 border border-blue-200 rounded-full bg-[#f0f8ff] placeholder-gray-400 focus:outline-none focus:ring-[#1fa1fd] focus:border-[#1fa1fd] sm:text-sm"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword
                          ? <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          : <EyeIcon className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-600 ml-4">{errors.password.message}</p>}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-md text-sm font-medium text-white bg-[#229bfa] hover:bg-[#1f8ce1] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (t('login.signingIn') || 'Iniciando sesión...') : (t('login.signIn') || 'Iniciar Sesión')}
                  </button>
                </div>

                <div className="flex flex-row items-center justify-between mt-4 text-sm">
                  <a href="#" className="font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                  <a href="#" className="font-medium text-[#229bfa] hover:text-[#1f8ce1] transition-colors">
                    Regístrate
                  </a>
                </div>
              </form>
            )}

            {/* QR attendance */}
            {activeTab === 'qr' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <QrCodeIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Registro de Asistencia</h3>
                  <p className="text-sm text-gray-500">
                    Escanea el código QR de tu carnet para registrar tu asistencia automáticamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-full shadow-md text-sm font-medium text-white bg-[#538f65] hover:bg-[#47795a] focus:outline-none transition-all"
                >
                  <QrCodeIcon className="h-5 w-5" />
                  Abrir escáner QR
                </button>

                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                  <p>• El QR debe contener el <strong>DNI</strong> del estudiante</p>
                  <p>• Antes de las 08:10 se registra como <strong className="text-green-600">Presente</strong></p>
                  <p>• Después de las 08:10 se registra como <strong className="text-yellow-600">Tardanza</strong></p>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">o</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('dni')}
                  className="w-full flex justify-center py-3 px-4 border border-[#229bfa] rounded-full text-sm font-medium text-[#229bfa] bg-white hover:bg-gray-50 transition-all"
                >
                  Iniciar sesión con DNI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
