import { useState, ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChartPieIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  HomeIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
  ClockIcon,
  BuildingLibraryIcon,
  UserIcon,
  BriefcaseIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  TicketIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  Cog8ToothIcon,
  BellIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface NavigationChild {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, 'ref'> & { title?: string; titleId?: string } & React.RefAttributes<SVGSVGElement>>;
  current: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, 'ref'> & { title?: string; titleId?: string } & React.RefAttributes<SVGSVGElement>>;
  current: boolean;
  children?: NavigationChild[];
}

const navigation: NavigationItem[] = [
  { name: 'dashboard.title', href: '/', icon: HomeIcon, current: false },
  {
    name: 'academic.title',
    href: '#',
    icon: AcademicCapIcon,
    current: false,
    children: [
      { name: 'academic.sections.title', href: '/sections', icon: AcademicCapIcon, current: false },
      { name: 'academic.schedules.title', href: '/schedules', icon: CalendarDaysIcon, current: false },
      { name: 'academic.timeSlots.title', href: '/time-slots', icon: ClockIcon, current: false },
      { name: 'academic.schoolYears.title', href: '/school-years', icon: BuildingLibraryIcon, current: false },
    ],
  },
  {
    name: 'users.title',
    href: '#',
    icon: UsersIcon,
    current: false,
    children: [
      { name: 'administration.users.title', href: '/users', icon: UserIcon, current: false },
      { name: 'administration.staff.title', href: '/staff', icon: BriefcaseIcon, current: false },
    ],
  },
  {
    name: 'enrollments.title',
    href: '#',
    icon: DocumentTextIcon,
    current: false,
    children: [
      { name: 'enrollments.individualEnrollment', href: '/enrollments/new', icon: DocumentTextIcon, current: false },
      { name: 'enrollments.bulkEnrollment', href: '/enrollments/bulk', icon: DocumentDuplicateIcon, current: false },
    ],
  },
  {
    name: 'attendance.title',
    href: '#',
    icon: ClipboardDocumentCheckIcon,
    current: false,
    children: [
      { name: 'attendance.title', href: '/attendance', icon: ClipboardDocumentCheckIcon, current: false },
      { name: 'attendanceRecords.title', href: '/attendance-records', icon: ChartPieIcon, current: false },
      { name: 'attendance.monthlyReport', href: '/monthly-attendance-report', icon: TableCellsIcon, current: false },
    ],
  },
  { name: 'incidents.title', href: '/incidents', icon: ExclamationTriangleIcon, current: false },
  {
    name: 'events.title',
    href: '#',
    icon: CalendarIcon,
    current: false,
    children: [
      { name: 'events.catalog', href: '/events', icon: TicketIcon, current: false },
      { name: 'events.attendance', href: '/events', icon: ClipboardDocumentCheckIcon, current: false },
    ],
  },
  { name: 'payments.title', href: '/payments', icon: BanknotesIcon, current: false },
];

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const updatedNavigation = navigation.map((item) => {
    if (item.children) {
      const hasActiveChild = item.children.some((child) => location.pathname === child.href);
      return {
        ...item,
        current: hasActiveChild,
        children: item.children.map((child) => ({
          ...child,
          current: location.pathname === child.href,
        })),
      };
    }
    return {
      ...item,
      current: location.pathname === item.href,
    };
  });

  const initialOpenGroups = updatedNavigation
    .filter((item) => item.children && item.current)
    .map((item) => item.name);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const isGroupOpen = (item: NavigationItem) => {
    return openGroups.includes(item.name) || (item.children ? item.children.some((c) => c.current) : false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#1e2433' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: '#538f65' }}
        >
          <AcademicCapIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">Sistema de Gestión Escolar</p>
          <p className="text-xs leading-tight" style={{ color: '#a0aec0' }}>
            Portal Educativo
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {updatedNavigation.map((item) => {
          if (item.children) {
            const open = isGroupOpen(item);
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    item.current
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={item.current ? { background: 'rgba(83,143,101,0.15)' } : {}}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      item.current ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                  />
                  <span className="flex-1 text-left">{t(item.name)}</span>
                  {open ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {open && (
                  <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-0.5">
                    {item.children!.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                          child.current
                            ? 'text-white font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={child.current ? { background: '#538f65' } : {}}
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        {t(child.name)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                item.current
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={item.current ? { background: '#538f65' } : {}}
            >
              <item.icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  item.current ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                }`}
              />
              {t(item.name)}
            </Link>
          );
        })}
      </nav>

      {/* Action buttons at bottom */}
      <div className="border-t border-white/10 px-3 py-4 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150 group"
        >
          <Cog8ToothIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
          Configuración
        </button>
        <button
          onClick={logout}
          title={t('signOut')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150 group"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7f6' }}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (drawer) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* ── Desktop sidebar (static) ── */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-64">
        <div className="w-64 h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar (mobile only hamburger + shared actions) */}
        <header
          className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#FAF9F6] border-b border-[#EBE8DD] shadow-sm"
          style={{ minHeight: '60px' }}
        >
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          {/* Desktop Title Space */}
          <div className="hidden lg:block">
             <h1 className="text-lg font-extrabold text-gray-800">
                {updatedNavigation.find(n => n.current)?.children?.find(c => c.current)?.name
                  ? t(updatedNavigation.find(n => n.current)?.children?.find(c => c.current)?.name as string)
                  : updatedNavigation.find(n => n.current)?.name 
                    ? t(updatedNavigation.find(n => n.current)?.name as string) 
                    : ''}
             </h1>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            <div className="flex items-center gap-2">
              <button className="relative p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full border border-[#FAF9F6]"></span>
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-gray-800">{user?.name || 'Administrador'}</p>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{user?.role || 'Admin Terra'}</p>
              </div>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0"
              >
                <UserCircleIcon className="w-full h-full text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 min-h-full flex flex-col relative pb-20">
            {children}
            <Outlet />

            {/* Global Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-8 py-6 text-center text-xs font-medium text-gray-400 mt-auto">
              <p className="mb-2">© 2024 Terra Academia. Sistema de Gestión Escolar Integral.</p>
              <div className="flex justify-center items-center gap-6">
                <a href="#" className="hover:text-gray-600 transition-colors">Privacidad</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Soporte Técnico</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Auditoría</a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
