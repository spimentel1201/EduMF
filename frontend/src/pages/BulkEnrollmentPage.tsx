import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import BulkEnrollment from '@/components/BulkEnrollment';
import { useTranslation } from 'react-i18next';

const BulkEnrollmentPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {t('enrollments.bulkEnrollment')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Carga un archivo Excel con los datos de los estudiantes para matricularlos en bloque.
          </p>
        </div>
        <Link
          to="/enrollments"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </Link>
      </div>

      {/* ── Content card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserGroupIcon className="w-5 h-5 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Matrícula Masiva</h2>
        </div>
        <BulkEnrollment />
      </div>
    </div>
  );
};

export default BulkEnrollmentPage;
