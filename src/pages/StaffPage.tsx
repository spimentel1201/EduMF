import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {staffService} from '../services/staffService';
import { useTranslation } from 'react-i18next';
import { STAFF_ROLES, STAFF_STATUSES } from '@/types/staff';

const getStaffRoleTranslationKey = (role: string) => {
  switch (role) {
    case 'Docente':
      return 'teacher';
    case 'Psicólogo(a)':
      return 'psychologist';
    case 'Mantenimiento':
      return 'maintenance';
    case 'CIST':
      return 'cist';
    case 'Dirección':
      return 'direction';
    case 'Auxiliar':
      return 'auxiliary';
    default:
      return role.toLowerCase();
  }
};

const getStaffStatusTranslationKey = (status: string) => {
  switch (status) {
    case 'Activo':
      return 'active';
    case 'Inactivo':
      return 'inactive';
    case 'Pendiente':
      return 'pending';
    default:
      return status.toLowerCase();
  }
};

export default function StaffPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const roles = ['All Roles', ...STAFF_ROLES];
  const statusOptions = ['All Statuses', ...STAFF_STATUSES];

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.getAll,
  });

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || member.role === selectedRole;
    const matchesStatus = selectedStatus === 'All Statuses' || member.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('staff.errorLoading')}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">{t('staff.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('staff.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            to="/staff/new"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            {t('staff.addStaff')}
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
              placeholder={t('staff.searchStaff')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div>
          <select
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role === 'All Roles' ? t('staff.allRoles') : t(`staff.roles.${getStaffRoleTranslationKey(role)}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All Statuses">{t('staff.allStatuses')}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {t(`staff.statusOptions.${getStaffStatusTranslationKey(status)}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                {t('staff.name')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('staff.email')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('staff.role')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('staff.status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredStaff.map((member) => (
              <tr key={member.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {member.firstName} {member.lastName}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {member.email}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {t(`staff.roles.${getStaffRoleTranslationKey(member.role)}`)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    member.status === 'Activo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {t(`staff.statusOptions.${getStaffStatusTranslationKey(member.status)}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
