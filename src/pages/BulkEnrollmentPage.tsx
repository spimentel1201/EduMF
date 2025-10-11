import React from 'react';
import BulkEnrollment from '@/components/BulkEnrollment';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const BulkEnrollmentPage: React.FC = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">{t('enrollments.bulkEnrollment')}</h1>
      <BulkEnrollment />
    </>
  );
};

export default BulkEnrollmentPage;