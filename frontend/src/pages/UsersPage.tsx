import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import IncidentTimeline from '@/components/IncidentTimeline';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import DataLoader from '@/components/DataLoader';

const ROLE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  admin:          { label: 'Admin',          bg: 'bg-purple-100', text: 'text-purple-700' },
  'Dirección':    { label: 'Dirección',      bg: 'bg-violet-100', text: 'text-violet-700' },
  CIST:           { label: 'CIST',           bg: 'bg-indigo-100', text: 'text-indigo-700' },
  teacher:        { label: 'Docente',        bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Docente:        { label: 'Docente',        bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'Psicólogo(a)': { label: 'Psicólogo(a)',   bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  Auxiliar:       { label: 'Auxiliar',       bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Mantenimiento:  { label: 'Mantenimiento',  bg: 'bg-gray-100',   text: 'text-gray-600'   },
  student:        { label: 'Alumno',         bg: 'bg-green-100',  text: 'text-green-700'  },
};

/** Filtros de rol: agrupa los roles antiguos (teacher) con los nuevos (Docente). */
const ROLE_FILTERS: { key: string; label: string; roles: string[] }[] = [
  { key: 'admin',         label: 'Admin',          roles: ['admin'] },
  { key: 'direccion',     label: 'Dirección',      roles: ['Dirección'] },
  { key: 'cist',          label: 'CIST',           roles: ['CIST'] },
  { key: 'docente',       label: 'Docente',        roles: ['teacher', 'Docente'] },
  { key: 'psicologo',     label: 'Psicólogo(a)',   roles: ['Psicólogo(a)'] },
  { key: 'auxiliar',      label: 'Auxiliar',       roles: ['Auxiliar'] },
  { key: 'mantenimiento', label: 'Mantenimiento',  roles: ['Mantenimiento'] },
  { key: 'student',       label: 'Alumno',         roles: ['student'] },
];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Solo estos roles pueden dar de baja o reactivar cuentas (igual que en el backend). */
const CAN_MANAGE_USERS = ['admin', 'Dirección', 'CIST'];

type PendingChange = { id: string; name: string; status: 'active' | 'inactive' };

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: PendingChange) => userService.updateStatus(id, status),
    onSuccess: (data: any) => {
      toast.success(data?.msg || 'Estado del usuario actualizado.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPendingChange(null);
    },
    onError: (err: any) => {
      toast.error(err?.msg || err?.message || 'No se pudo actualizar el estado del usuario.');
    },
  });

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user: any) => {
      const role = user.role ?? '';
      counts[role] = (counts[role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = users.filter((user: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (user.name ?? '').toLowerCase().includes(term) ||
      (user.email ?? '').toLowerCase().includes(term) ||
      (user.dni ?? '').toLowerCase().includes(term);
    const matchesRole =
      selectedRole === 'all' ||
      (ROLE_FILTERS.find((f) => f.key === selectedRole)?.roles.includes(user.role) ?? false);
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

  const askChange = (user: any) => {
    if (user.id === currentUser?.id && user.status === 'active') {
      toast.error('No puedes dar de baja tu propia cuenta.');
      return;
    }
    setPendingChange({
      id: user.id,
      name: user.name,
      status: user.status === 'active' ? 'inactive' : 'active',
    });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{t('users.errorLoading')}</p>
      </div>
    );
  }

  const deactivating = pendingChange?.status === 'inactive';
  const canManage = CAN_MANAGE_USERS.includes(currentUser?.role ?? '');
  const activeCount = users.filter((u: any) => u.status === 'active').length;
  const inactiveCount = users.length - activeCount;

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
          <button
            onClick={() => handleRole('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedRole === 'all'
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={selectedRole === 'all' ? { background: '#538f65' } : {}}
          >
            Todos ({users.length})
          </button>
          {ROLE_FILTERS.map((filter) => {
            const count = filter.roles.reduce((sum, role) => sum + (roleCounts[role] ?? 0), 0);
            const isSelected = selectedRole === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => handleRole(filter.key)}
                title={`Filtrar por ${filter.label}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : count === 0
                      ? 'bg-white text-gray-300 border-gray-100 cursor-default'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={isSelected ? { background: '#538f65' } : {}}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {activeCount} activos · {inactiveCount} dados de baja · {filteredUsers.length} mostrados
      </p>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative min-h-[280px] overflow-x-auto">
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
                const roleKey = user.role ?? '';
                const roleStyle = ROLE_STYLES[roleKey] ?? { label: user.role, bg: 'bg-gray-100', text: 'text-gray-600' };
                const isActive = user.status === 'active';
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr key={user.id?.toString() ?? index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isActive ? '' : 'opacity-50'}`}
                          style={{ background: '#538f65' }}
                        >
                          {initials(user.name ?? '')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400">
                            {user.tipoDocumento === 'CODIGO' ? 'Código' : 'DNI'} {user.dni}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {isActive ? 'Activo' : 'Dado de baja'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {roleKey === 'student' && (
                          <button
                            onClick={() => openTimeline(user.id, user.name)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
                          >
                            <ClipboardDocumentListIcon className="w-4 h-4" />
                            Incidencias
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => askChange(user)}
                            disabled={isSelf && isActive}
                            title={isSelf && isActive ? 'No puedes darte de baja a ti mismo' : undefined}
                            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                              isActive
                                ? 'text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed'
                                : 'text-green-700 hover:text-green-900'
                            }`}
                          >
                            {isActive ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                            {isActive ? 'Dar de baja' : 'Activar'}
                          </button>
                        )}
                      </div>
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
          {isLoading && <DataLoader label="Cargando usuarios" icon={UserGroupIcon} className="absolute inset-0 z-10 min-h-full" />}
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

      {/* ── Confirmación de baja / activación ── */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !statusMutation.isPending && setPendingChange(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                deactivating ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {deactivating
                  ? <ExclamationTriangleIcon className="w-5 h-5" />
                  : <CheckCircleIcon className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900">
                  {deactivating ? 'Dar de baja a' : 'Reactivar a'} {pendingChange.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {deactivating
                    ? 'El usuario no podrá iniciar sesión ni usar el sistema. Sus datos, matrícula e historial se conservan y puedes reactivarlo cuando quieras.'
                    : 'El usuario podrá volver a iniciar sesión con sus credenciales habituales.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setPendingChange(null)}
                disabled={statusMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => statusMutation.mutate(pendingChange)}
                disabled={statusMutation.isPending}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60 ${
                  deactivating ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-[#47795a]'
                }`}
                style={deactivating ? {} : { background: '#538f65' }}
              >
                {statusMutation.isPending
                  ? 'Guardando…'
                  : deactivating ? 'Sí, dar de baja' : 'Sí, activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
