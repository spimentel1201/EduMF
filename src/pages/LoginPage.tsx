import { useState, useEffect } from 'react';
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
  ClockIcon,
  UserIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import QrReader from 'react-qr-reader-es6';
import { t } from 'i18next';

const loginSchema = z.object({
  dni: z.string().min(8, t('login.dniMinLength')),
  password: z.string().min(6, t('login.passwordMinLength')),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'dni' | 'qr'>('dni');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [showAttendanceSuccess, setShowAttendanceSuccess] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { login, loginWithQR, isLoading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.dni, data.password, '/');
    } catch (error) {
      alert(t('login.loginError'));
    }
  };

  const handleQRScan = (data: string | null) => {
    if (data) {
      setScannedData(data);
      setShowAttendanceSuccess(true);
      setTimeout(() => {
        setShowAttendanceSuccess(false);
        setScannedData(null);
      }, 5000);
      setTimeout(() => {      
      }, 2000);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const resetQRScan = () => {
    setScannedData(null);
    setShowAttendanceSuccess(false);
    setIsScanning(false);
  };

  if (isScanning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-4xl">
          {/* Área de escaneo (lado izquierdo) */}
          <div className="flex-1 space-y-6 bg-white p-8 rounded-lg shadow relative">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                {t('login.scanQrCode')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('login.scanQrInstructions')}
              </p>
            </div>
            
            <div className="mt-6 rounded-lg overflow-hidden border-2 border-gray-200">
              <div className="relative aspect-square">
                <QrReader
                  onScan={handleQRScan}
                  onError={(error) => console.error('QR Scanner error:', error)}
                  style={{ width: '100%', height: '100%' }}
                  showViewFinder={true}
                  delay={300}
                  facingMode="environment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-blue-500 rounded-lg pointer-events-none"></div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsScanning(false)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
                {t('login.cancel')}
              </button>
            </div>
          </div>
          
          {/* Área de notificaciones (lado derecho) */}
          <div className="hidden md:block md:ml-6 md:w-80 space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
                {t('login.currentTime')}
              </h3>
              <div className="text-center bg-blue-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-900">
                  {currentDateTime.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  {currentDateTime.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {/* Notificación de asistencia registrada */}
            {showAttendanceSuccess && scannedData ? (
              <div className="bg-white p-6 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('login.attendanceRegistered')}
                  </h3>
                  
                  {/* Información del QR */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">{t('login.scannedQr')}:</p>
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {scannedData.length > 30 ? `${scannedData.substring(0, 30)}...` : scannedData}
                    </p>
                  </div>
                  
                  {/* Fecha y hora */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-blue-700 mb-1">{t('login.registeredAt')}:</p>
                    <p className="text-sm font-bold text-blue-900">
                      {currentDateTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {t('login.notificationWillClose')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  {t('login.instructions')}
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {t('login.scanQrInstructionsDetail1')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('login.scanQrInstructionsDetail2')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="min-h-screen flex w-full">
      {/* Lado Izquierdo - Ilustración y gradiente */}
      <div className="hidden lg:flex flex-col lg:w-[55%] relative bg-gradient-to-r from-[#1fa1fd] to-[#f49342] overflow-hidden">
        <div className="absolute top-16 left-16 z-20">
          <h1 className="text-white text-6xl font-black leading-tight drop-shadow-md">
            Empoderando tu<br/>futuro educativo
          </h1>
        </div>
        
        {/* Usando un div con background-image para centrar y adaptar la imagen según el contenedor */}
        <div className="absolute top-44 inset-x-0 bottom-0 bg-cover bg-top bg-no-repeat" style={{ backgroundImage: "url('/login-illustration.png')" }}>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Login */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center bg-white px-8 sm:px-12 py-12 relative">
        <div className="max-w-md w-full">
          
          <div className="flex flex-col items-center">
            {/* Logo y título */}
            <div className="flex items-center text-blue-900 text-3xl font-bold mb-6">
              <span className="text-[#1fa1fd] text-5xl mr-2 font-black">E</span>
              EduMF
            </div>
            <h2 className="text-center text-[22px] font-bold text-gray-900">
              {t('login.title') || 'Bienvenido a EduMF'}
            </h2>
          </div>
          
          <div className="mt-8">
            <div className="flex border-b border-gray-200 w-full mb-8">
              <button
                type="button"
                className={`flex-1 py-3 font-medium text-sm text-center focus:outline-none transition-colors ${
                  activeTab === 'dni'
                    ? 'border-b-2 border-[#1fa1fd] text-[#1fa1fd]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('dni')}
              >
                {t('login.loginTab') || 'Iniciar Sesión'}
              </button>
              <button
                type="button"
                className={`flex-1 py-3 font-medium text-sm text-center focus:outline-none transition-colors ${
                  activeTab === 'qr'
                    ? 'border-b-2 border-[#1fa1fd] text-[#1fa1fd]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('qr')}
              >
                {t('login.qrTab') || 'QR'}
              </button>
            </div>

            {activeTab === 'dni' ? (
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                      {t('login.dniLabel') || 'DNI'}
                    </label>
                    <div className="relative rounded-full shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        id="dni"
                        type="text"
                        autoComplete="username"
                        className="appearance-none block w-full pl-11 pr-3 py-3 border border-blue-200 rounded-full bg-[#f0f8ff] placeholder-gray-400 focus:outline-none focus:ring-[#1fa1fd] focus:border-[#1fa1fd] sm:text-sm transition-colors"
                        {...register('dni')}
                      />
                    </div>
                    {errors.dni && (
                      <p className="mt-1 text-sm text-red-600 ml-4">{errors.dni.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                      {t('login.passwordLabel') || 'Contraseña'}
                    </label>
                    <div className="relative rounded-full shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="appearance-none block w-full pl-11 pr-10 py-3 border border-blue-200 rounded-full bg-[#f0f8ff] placeholder-gray-400 focus:outline-none focus:ring-[#1fa1fd] focus:border-[#1fa1fd] sm:text-sm transition-colors"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 ml-4">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-md text-sm font-medium text-white bg-[#229bfa] hover:bg-[#1f8ce1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#229bfa] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? t('login.signingIn') || 'Iniciando sesión...' : t('login.signIn') || 'Iniciar Sesión'}
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
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    {t('login.qrScanInstruction')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-full shadow-md text-sm font-medium text-white bg-[#229bfa] hover:bg-[#1f8ce1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#229bfa] transition-all"
                  >
                    <QrCodeIcon className="h-5 w-5 mr-2" />
                    {t('login.scanQrCode') || 'Escanear QR'}
                  </button>
                </div>
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">{t('login.or') || 'o'}</span>
                  </div>
                </div>
                
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dni')}
                    className="w-full flex justify-center py-3 px-4 border border-[#229bfa] rounded-full shadow-sm text-sm font-medium text-[#229bfa] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#229bfa] transition-all"
                  >
                    {t('login.signInWithDni') || 'Iniciar sesión con DNI'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
