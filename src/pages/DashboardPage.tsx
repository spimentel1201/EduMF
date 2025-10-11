import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getDashboardStats,
  });

  return (
    <div className="space-y-6 py-6">
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t('dashboard.title')}</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <p>Cargando estadísticas...</p>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary-500 p-3">
                  <UserGroupIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{t('dashboard.stats.totalStudents')}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalStudents}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  +12%
                </p>
                <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                      {t('dashboard.viewAll')}<span className="sr-only"> {t('dashboard.stats.totalStudents')} {t('dashboard.stats.stats')}</span>
                    </Link>
                  </div>
                </div>
              </dd>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary-500 p-3">
                  <UserIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{t('dashboard.stats.totalStaff')}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalStaff}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  +3%
                </p>
                <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                      {t('dashboard.viewAll')}<span className="sr-only"> {t('dashboard.stats.totalStaff')} {t('dashboard.stats.stats')}</span>
                    </Link>
                  </div>
                </div>
              </dd>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary-500 p-3">
                  <CheckCircleIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{t('dashboard.stats.presentRate')}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stats?.presentRate}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  +5%
                </p>
                <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                      {t('dashboard.viewAll')}<span className="sr-only"> {t('dashboard.stats.presentRate')} {t('dashboard.stats.stats')}</span>
                    </Link>
                  </div>
                </div>
              </dd>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
              <dt>
                <div className="absolute rounded-md bg-primary-500 p-3">
                  <CalendarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{t('dashboard.stats.activeSections')}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stats?.activeSections}</p>
                <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  +4%
                </p>
                <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                      {t('dashboard.viewAll')}<span className="sr-only"> {t('dashboard.stats.activeSections')} {t('dashboard.stats.stats')}</span>
                    </Link>
                  </div>
                </div>
              </dd>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
