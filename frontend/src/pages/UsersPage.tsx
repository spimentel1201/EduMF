import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';
import IncidentTimeline from '@/components/IncidentTimeline';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

const ROLE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  admin:   { label: 'Admin',    bg: 'bg-purple-100', text: 'text-purple-700' },
  teacher: { label: 'Docente',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
  student: { label: 'Alumno',   bg: 'bg-green-100',  text: 'text-green-700'  },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
  });

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role?.toLowerCase() === selectedRole;
    return matchesSearch && matchesRole;
  });

  const { currentPage, totalPages, paginated, goTo, setCurrentPage } = usePagination(filteredUsers, pageSize);

  // Reset page when filters change
  const handleSearch = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleRole   = (value: string) => { setSelectedRole(value); setCurrentPage(1); };

  const openTimeline = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setTimelineOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{t('users.errorLoading')}</p>
      </div>
    );
  }

  const roles = ['all', 'admin', 'teacher', 'student'];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('users.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {t('users.subtitle')}
          </p>
        </div>
        <Link
          to="/users/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <PlusIcon className="w-4 h-4" />
          {t('users.addUser')}
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('users.searchUsers')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => handleRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedRole === role
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
              style={selectedRole === role ? { background: '#538f65' } : {}}
            >
              {role === 'all' ? 'Todos' : ROLE_LABELS[role]?.label ?? role}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  {t('users.name')}
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  {t('users.email')}
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  {t('users.role')}
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  {t('users.status')}
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((user: any, index: number) => {
                const roleKey = user.role?.toLowerCase() ?? '';
                const roleStyle = ROLE_LABELS[roleKey] ?? { label: user.role, bg: 'bg-gray-100', text: 'text-gray-600' };
                const isActive = user.status === 'Activo';
                return (
                  <tr key={user.id?.toString() ?? index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#538f65' }}
                        >
                          {initials(user.name ?? '')}
                        </div>
                        <span className="font-semibold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {roleKey === 'student' && (
                        <button
                          onClick={() => openTimeline(user.id, user.name)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
                        >
                          <ClipboardDocumentListIcon className="w-4 h-4" />
                          Incidencias
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={goTo}
          onPageSizeChange={setPageSize}
          itemLabel="usuarios"
        />
      </div>

      {selectedUser && (
        <IncidentTimeline
          isOpen={timelineOpen}
          onClose={() => { setTimelineOpen(false); setSelectedUser(null); }}
          userId={selectedUser.id}
          userName={selectedUser.name}
        />
      )}
    </div>
  );
}
