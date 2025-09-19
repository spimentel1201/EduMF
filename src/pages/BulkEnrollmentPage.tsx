import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import BulkEnrollment from '@/components/BulkEnrollment';

const BulkEnrollmentPage: React.FC = () => {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-6">Matrícula Masiva de Estudiantes</h1>
      <BulkEnrollment />
    </DashboardLayout>
  );
};

export default BulkEnrollmentPage;