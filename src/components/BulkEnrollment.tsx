import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentService } from '../services/enrollmentService';
import { CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function BulkEnrollment() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const bulkEnrollmentMutation = useMutation({
    mutationFn: enrollmentService.bulkEnrollStudents,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(data.msg || 'Matrículas masivas creadas exitosamente!');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al realizar la matrícula masiva.');
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, seleccione un archivo para subir.');
      return;
    }

    bulkEnrollmentMutation.mutate(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const headers = 'studentName,sectionName,schoolYearName,enrollmentDate'; // Cambiado a nombres descriptivos
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'enrollment_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary-50 file:text-primary-700
            hover:file:bg-primary-100"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || bulkEnrollmentMutation.isPending}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <CloudArrowUpIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
          {bulkEnrollmentMutation.isPending ? 'Subiendo...' : 'Subir Archivo'}
        </button>
      </div>
      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300"
      >
        <DocumentArrowDownIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
        Descargar Plantilla CSV
      </button>
    </div>
  );
}