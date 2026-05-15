import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { staffService } from '../services/staffService';
import { useTranslation } from 'react-i18next';
import { STAFF_ROLES, STAFF_STATUSES } from '@/types/staff';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Docente:       { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'Psicólogo(a)':{ bg: 'bg-purple-100', text: 'text-purple-700' },
  Mantenimiento: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CIST:          { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  Dirección:     { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Auxiliar:      { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export default function StaffPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.getAll,
  });

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole   = !selectedRole   || member.role   === selectedRole;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
        <p className="text-sm text-red-500">{t('staff.errorLoading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('staff.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {t('staff.subtitle')}
          </p>
        </div>
        <Link
          to="/staff/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <PlusIcon className="w-4 h-4" />
          {t('staff.addStaff')}
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('staff.searchStaff')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">{t('staff.allRoles')}</option>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
        >
          <option value="">{t('staff.allStatuses')}</option>
          {STAFF_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('staff.name')}</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('staff.email')}</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('staff.role')}</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">{t('staff.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.map((member) => {
                const roleStyle = ROLE_COLORS[member.role] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                const isActive = member.status === 'Activo';
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#538f65' }}
                        >
                          {initials(member.firstName, member.lastName)}
                        </div>
                        <span className="font-semibold text-gray-900">{member.firstName} {member.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{member.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    No se encontró personal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">{filteredStaff.length} miembro{filteredStaff.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}
