import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { attendanceService } from '@/services/attendanceService';
import { incidentService } from '@/services/incidentService';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  BellAlertIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Animated Counter Component
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  return (
    <span className="tabular-nums">
      {value?.toLocaleString() || 0}{suffix}
    </span>
  );
};

// KPI Card with gradient
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  link
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: any;
  gradient: string;
  link?: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10"></div>
    <div className="absolute -right-2 -bottom-6 h-32 w-32 rounded-full bg-white/5"></div>

    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-white/20 p-3">
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm opacity-80 mt-1">{title}</p>
        {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
      </div>

      {link && (
        <Link to={link} className="mt-4 inline-flex items-center text-sm font-medium hover:underline">
          Ver detalles <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      )}
    </div>
  </div>
);

// Quick Action Button
const QuickAction = ({
  title,
  description,
  icon: Icon,
  link,
  color
}: {
  title: string;
  description: string;
  icon: any;
  link: string;
  color: string;
}) => (
  <Link
    to={link}
    className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary-200"
  >
    <div className={`rounded-lg p-3 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-gray-900 group-hover:text-primary-600">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
  </Link>
);

// Recent Activity Item
const ActivityItem = ({
  title,
  description,
  time,
  icon: Icon,
  iconColor
}: {
  title: string;
  description: string;
  time: string;
  icon: any;
  iconColor: string;
}) => (
  <div className="flex items-start gap-3 py-3">
    <div className={`rounded-full p-2 ${iconColor}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 truncate">{description}</p>
    </div>
    <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
  </div>
);

export default function DashboardPage() {


  // Stats del dashboard (real)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getDashboardStats,
  });

  // Stats de incidencias (real)
  const { data: incidentStats } = useQuery({
    queryKey: ['incidentStats'],
    queryFn: incidentService.getStats,
  });

  // Tendencia semanal de asistencia (real)
  const { data: weeklyTrend = [] } = useQuery({
    queryKey: ['weeklyTrend'],
    queryFn: attendanceService.getWeeklyTrend,
  });

  // Transformar datos de incidencias por tipo
  const incidentTypeData = useMemo(() => {
    const typeColors: Record<string, string> = {
      'Conductual': '#ef4444',
      'Académica': '#eab308',
      'Bullying': '#8b5cf6',
      'Salud': '#22c55e',
      'Daño a propiedad': '#f97316',
      'Otro': '#6b7280',
    };

    if (incidentStats?.byType && Array.isArray(incidentStats.byType)) {
      return incidentStats.byType.map(item => ({
        name: item._id,
        value: item.count,
        color: typeColors[item._id] || '#6b7280'
      }));
    }

    return [];
  }, [incidentStats?.byType]);

  // Actividades recientes (datos estáticos de ejemplo)
  const recentActivities = [
    { title: 'Asistencia registrada', description: '3ro A - 25 estudiantes', time: 'Hace 5 min', icon: CheckCircleIcon, color: 'bg-green-500' },
    { title: 'Nueva incidencia', description: 'Incidente conductual reportado', time: 'Hace 15 min', icon: ExclamationTriangleIcon, color: 'bg-red-500' },
    { title: 'Asistencia registrada', description: '2do B - 22 estudiantes', time: 'Hace 30 min', icon: CheckCircleIcon, color: 'bg-green-500' },
    { title: 'Actualización de horario', description: 'Cambio en horario de 4to C', time: 'Hace 1 hora', icon: ClockIcon, color: 'bg-purple-500' },
  ];

  const currentDate = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const currentTime = format(new Date(), 'HH:mm');

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              ¡Bienvenido de vuelta!
            </h1>
          </div>
          <p className="mt-1 text-gray-500 capitalize">{currentDate}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-100">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900">{currentTime}</span>
          </div>
          <Link
            to="/attendance/take"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/30"
          >
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
            Tomar Asistencia
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Estudiantes"
          value={<AnimatedNumber value={stats?.totalStudents || 0} />}
          subtitle="Matriculados activos"
          icon={UserGroupIcon}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          link="/enrollments"
        />
        <KPICard
          title="Personal Activo"
          value={<AnimatedNumber value={stats?.totalStaff || 0} />}
          subtitle="Docentes y administrativos"
          icon={UserIcon}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          link="/staff"
        />
        <KPICard
          title="Asistencia Hoy"
          value={stats?.presentRate || '0%'}
          subtitle={`${stats?.presentToday || 0} de ${stats?.totalStudents || 0} estudiantes`}
          icon={CheckCircleIcon}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          link="/attendance/records"
        />
        <KPICard
          title="Incidencias Abiertas"
          value={<AnimatedNumber value={incidentStats?.pending || 0} />}
          subtitle="Requieren atención"
          icon={ExclamationTriangleIcon}
          gradient="bg-gradient-to-br from-orange-500 to-red-500"
          link="/incidents"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tendencia de Asistencia</h3>
              <p className="text-sm text-gray-500">Esta semana (Lun-Vie)</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span> Asistencia
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span> Tardanza
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Ausencia
              </span>
            </div>
          </div>
          {weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorAsistencia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Area type="monotone" dataKey="asistencia" stroke="#22c55e" strokeWidth={2} fill="url(#colorAsistencia)" />
                <Line type="monotone" dataKey="tardanza" stroke="#eab308" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ausencia" stroke="#ef4444" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <p>No hay datos de asistencia esta semana</p>
            </div>
          )}
        </div>

        {/* Incident Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incidencias por Tipo</h3>
            <p className="text-sm text-gray-500">Total: {incidentStats?.total || 0}</p>
          </div>
          {incidentTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={incidentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incidentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {incidentTypeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-xs text-gray-600">{item.name}</span>
                    <span className="text-xs font-bold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400">
              <p>No hay incidencias registradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickAction
              title="Tomar Asistencia"
              description="Registrar asistencia del día"
              icon={ClipboardDocumentCheckIcon}
              link="/attendance/take"
              color="bg-green-500"
            />
            <QuickAction
              title="Nueva Incidencia"
              description="Registrar un nuevo incidente"
              icon={ExclamationTriangleIcon}
              link="/incidents/new"
              color="bg-red-500"
            />
            <QuickAction
              title="Reportes de Asistencia"
              description="Ver reportes mensuales"
              icon={ChartBarIcon}
              link="/attendance/monthly-report"
              color="bg-blue-500"
            />
            <QuickAction
              title="Gestionar Secciones"
              description="Administrar aulas y grupos"
              icon={AcademicCapIcon}
              link="/sections"
              color="bg-purple-500"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
            <BellAlertIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  icon={activity.icon}
                  iconColor={activity.color}
                />
              ))
            ) : (
              <p className="text-center py-8 text-gray-400 text-sm">
                No hay actividad reciente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pending Incidents Alert */}
      {(incidentStats?.pending || 0) > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-orange-100 p-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900">
                Tienes {incidentStats?.pending || 0} incidencias pendientes
              </h4>
              <p className="text-sm text-orange-700">
                Hay incidencias que requieren tu atención y seguimiento.
              </p>
            </div>
            <Link
              to="/incidents?status=Pendiente"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Revisar ahora
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
