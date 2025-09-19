import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const stats = [
  { id: 1, name: 'Total Students', value: '1,234', icon: UserGroupIcon, change: '+12%', changeType: 'positive' },
  { id: 2, name: 'Total Staff', value: '89', icon: UserIcon, change: '+3', changeType: 'positive' },
  { id: 3, name: 'Present Today', value: '1,123', icon: CheckCircleIcon, change: '+5%', changeType: 'positive' },
  { id: 4, name: 'Active Schedules', value: '67', icon: CalendarIcon, change: '+4', changeType: 'positive' },
];

const recentActivity = [
  { id: 1, name: 'Mathematics Class', time: '2 hours ago', status: 'Completed', people: ['/placeholder-avatar-1.jpg', '/placeholder-avatar-2.jpg'], total: 45, present: 42 },
  { id: 2, name: 'Science Lab', time: '4 hours ago', status: 'Completed', people: ['/placeholder-avatar-3.jpg', '/placeholder-avatar-4.jpg'], total: 30, present: 28 },
  { id: 3, name: 'History Lecture', time: '6 hours ago', status: 'Completed', people: ['/placeholder-avatar-5.jpg', '/placeholder-avatar-6.jpg'], total: 50, present: 47 },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 py-6">
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t('dashboard.title')}</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-primary-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{t(`dashboard.stats.${stat.name.replace(/ /g, '')}`)}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </p>
              <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
                    {t('dashboard.viewAll')}<span className="sr-only"> {t(`dashboard.stats.${stat.name.replace(/ /g, '')}`)} {t('dashboard.stats.stats')}</span>
                  </Link>
                </div>
              </div>
            </dd>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{t('dashboard.recentActivity')}</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-primary-600">{activity.name}</p>
                  <div className="ml-2 flex flex-shrink-0">
                    <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                      {t(`dashboard.activityStatus.${activity.status}`)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      <span>{activity.present}/{activity.total} {t('dashboard.present')}</span>
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      <span>{activity.time}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <div className="flex -space-x-1 overflow-hidden">
                      {activity.people.map((person, index) => (
                        <img
                          key={index}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                          src={person}
                          alt=""
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-right text-sm font-medium sm:rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Link to="/staff" className="text-primary-600 hover:text-primary-500">
                {t('dashboard.manageStaff')}
              </Link>
              <Link to="/schedules" className="text-primary-600 hover:text-primary-500">
                {t('dashboard.viewSchedules')}
              </Link>
              <Link to="/attendance/take" className="text-primary-600 hover:text-primary-500">
                {t('dashboard.takeAttendance')}
              </Link>
            </div>
            <Link to="/attendance" className="text-primary-600 hover:text-primary-500">
              {t('dashboard.viewAllActivity')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
