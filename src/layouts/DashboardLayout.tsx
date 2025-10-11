import { Fragment, ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChartPieIcon,
  ChevronDownIcon,
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
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string; titleId?: string; } & React.RefAttributes<SVGSVGElement>>;
  current: boolean;
  children?: NavigationItem[];
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
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const updatedNavigation = navigation.map(item => {
    if (item.children) {
      const hasActiveChild = item.children.some(child => location.pathname === child.href);
      return {
        ...item,
        current: hasActiveChild,
        children: item.children.map(child => ({
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Disclosure as="nav" className="bg-white shadow-sm">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between">
                <div className="flex">
                  <div className="flex flex-shrink-0 items-center">
                    <span className="text-xl font-bold text-primary-600">SchoolSys</span>
                  </div>
                  <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                    {updatedNavigation.map((item) => (
                      item.children ? (
                        <Menu as="div" key={item.name} className="relative flex">
                          <Menu.Button
                            className={classNames(
                              item.current
                                ? 'border-primary-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                              'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                            )}
                          >
                            <item.icon className="mr-2 h-5 w-5" />
                            {t(item.name)}
                            <ChevronDownIcon className="ml-2 h-5 w-5" aria-hidden="true" />
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute left-0 z-10 mt-10 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              {item.children.map((child) => (
                                <Menu.Item key={child.name}>
                                  {({ active }) => (
                                    <Link
                                      to={child.href}
                                      className={classNames(
                                        active ? 'bg-gray-100' : '',
                                        child.current ? 'bg-gray-100 text-primary-700' : '',
                                        'block px-4 py-2 text-sm text-gray-700'
                                      )}
                                    >
                                      {t(child.name)}
                                    </Link>
                                  )}
                                </Menu.Item>
                              ))}
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      ) : (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={classNames(
                            item.current
                              ? 'border-primary-500 text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                            'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                          )}
                          aria-current={item.current ? 'page' : undefined}
                        >
                          <item.icon className="mr-2 h-5 w-5" />
                          {t(item.name)}
                        </Link>
                      )
                    ))}
                  </div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center">
                  <LanguageSwitcher />
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={logout}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              <ArrowLeftOnRectangleIcon className="mr-2 h-5 w-5" />
                              {t('signOut')}
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pt-2 pb-3">
                {updatedNavigation.map((item) => (
                  item.children ? (
                    <Disclosure as="div" key={item.name} className="space-y-1">
                      <Disclosure.Button
                        className={classNames(
                          item.current
                            ? 'bg-primary-50 border-primary-500 text-primary-700'
                            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                          'group flex w-full items-center border-l-4 py-2 pl-3 pr-4 text-base font-medium'
                        )}
                      >
                        <item.icon
                          className={classNames(
                            item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                            'mr-4 h-6 w-6 flex-shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {t(item.name)}
                        <ChevronDownIcon
                          className={classNames(
                            open ? 'rotate-180' : '',
                            'ml-auto h-5 w-5 flex-shrink-0 transform'
                          )}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="space-y-1">
                        {item.children.map((child) => (
                          <Disclosure.Button
                            key={child.name}
                            as={Link}
                            to={child.href}
                            className={classNames(
                              child.current ? 'bg-gray-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
                              'block rounded-md py-2 pl-12 pr-3 text-sm font-medium'
                            )}
                          >
                            {t(child.name)}
                          </Disclosure.Button>
                        ))}
                      </Disclosure.Panel>
                    </Disclosure>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        item.current
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      )}
                      aria-current={item.current ? 'page' : undefined}
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {t(item.name)}
                    </Link>
                  )
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-8 w-8 rounded-full text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user?.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Disclosure.Button
                    as="button"
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    {t('signOut')}
                  </Disclosure.Button>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
