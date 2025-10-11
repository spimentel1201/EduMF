import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';

// Función auxiliar para convertir el rol del backend a la clave de traducción
const getRoleTranslationKey = (role: string) => {
  if (!role) return '';
  // Aseguramos que el rol siempre esté en minúsculas para coincidir con las claves de traducción.
  return role.toLowerCase();
};

// Función auxiliar para convertir el estado del backend a la clave de traducción
const getStatusTranslationKey = (status: string) => {
  if (!status) return '';
  // Asumiendo que los estados del backend pueden ser 'Activo', 'Inactivo' (español)
  // y las claves de traducción son 'Active', 'Inactive' (inglés)
  switch (status) {
    case 'Activo':
      return 'Active';
    case 'Inactivo':
      return 'Inactive';
    default:
      return status; // Fallback para otros casos
  }
};

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  // El estado selectedRole y el array roles deben usar los valores del backend para el filtrado
  // y luego traducir para la visualización.
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const roles = ['All Roles', 'admin', 'teacher', 'student']; // Estos deben coincidir con los valores del backend si es posible, o ser mapeados.

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
  });

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    // Comparar con el valor real del rol del objeto de usuario, después de normalizarlo
    const matchesRole = selectedRole === 'All Roles' || getRoleTranslationKey(user.role) === selectedRole;
    return matchesSearch && matchesRole;
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
        <p className="text-red-600">{t('users.errorLoading')}: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">{t('users.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('users.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            to="/users/new"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            {t('users.addUser')}
          </Link>
        </div>
      </div>

      {/* Search and filter */}
      <div className="space-y-4">
        <div className="relative">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('users.searchUsers')}
              className="p-2 border border-gray-300 rounded-md w-full"
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
                {role === 'All Roles' ? t('users.allRoles') : t(`users.roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                {t('users.name')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('users.email')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('users.role')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                {t('users.status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredUsers.map((user: any, index: number) => (
              <tr key={user.id?.toString() || index.toString()}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {user.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {t(`users.roles.${getRoleTranslationKey(user.role)}`)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <td className="py-2 px-4 border-b">
                    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${
                    getStatusTranslationKey(user.status) === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {t(`users.statusOptions.${getStatusTranslationKey(user.status)}`)}
                  </span>
                  </td>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
