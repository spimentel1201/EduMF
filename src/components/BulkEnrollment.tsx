import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { enrollmentService } from '../services/enrollmentService';
import { schoolYearService } from '../services/schoolYearService';
import { sectionService } from '../services/sectionService';
import { CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function BulkEnrollment() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: schoolYears, isLoading: isLoadingSchoolYears } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const levels = ['Inicial', 'Primaria', 'Secundaria'];

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Extract general data
      const schoolYearName = worksheet['C7']?.v;
      const sectionName = worksheet['C8']?.v;

      if (!schoolYearName || !sectionName) {
        toast.error('Faltan datos generales (Año académico o Grado y Sección) en el archivo.');
        setSelectedFile(null);
        return;
      }

      // Extract student data starting from row 12
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 11 });

      const studentsToEnroll = jsonData.map((row: any) => ({
        firstName: row[0], // NOMBRES
        lastName: row[1],  // APELLIDOS
        dni: row[2],       // DNI
        gender: row[3],    // GENERO
        birthDate: row[4], // FECHA_NAC
      }));

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('schoolYearName', schoolYearName);
      formData.append('sectionName', sectionName);

      bulkEnrollmentMutation.mutate(formData);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDownloadTemplate = () => {
    if (!selectedSchoolYear || !selectedSection || !selectedLevel) {
      toast.error('Por favor, seleccione un Año Académico, Sección y Nivel para descargar la plantilla.');
      return;
    }

    const ws_data = [
      ['DATOS GENERALES:'],
      [],
      ['Institución educativa:', '', '' ],
      ['Nivel:', '', selectedLevel],
      ['Nombre:', '', '' ], // Placeholder for institution name if needed
      ['Datos referentes al registro de notas:'],
      ['Año académico:', '', schoolYears?.find(year => year.id === selectedSchoolYear)?.name || ''],
      ['Grado y Seccion:', '', sections?.find(section => section.id === selectedSection)?.name || ''],
      [],
      [],
      ['NOMBRES', 'APELLIDOS', 'DNI', 'GENERO', 'FECHA_NAC'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths
    const wscols = [
      { wch: 15 }, // NOMBRES
      { wch: 20 }, // APELLIDOS
      { wch: 15 }, // DNI
      { wch: 15 }, // GENERO
      { wch: 15 }  // FECHA_NAC
    ];
    ws['!cols'] = wscols;

    // Merge cells for general data
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // DATOS GENERALES
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Institución educativa
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Nivel
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Nombre
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }, // Datos referentes al registro de notas
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, // Año académico
      { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } }, // Grado y Seccion
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrícula');
    XLSX.writeFile(wb, 'plantilla_matricula.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="schoolYear" className="block text-sm font-medium leading-6 text-gray-900">
            Año Académico
          </label>
          <select
            id="schoolYear"
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
          >
            <option value="">Seleccione Año</option>
            {isLoadingSchoolYears ? (
              <option>Cargando...</option>
            ) : (
              schoolYears?.map((year: any) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="section" className="block text-sm font-medium leading-6 text-gray-900">
            Sección
          </label>
          <select
            id="section"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
          >
            <option value="">Seleccione Sección</option>
            {isLoadingSections ? (
              <option>Cargando...</option>
            ) : (
              sections?.map((section: any) => (
                <option key={section.id} value={section.id}>
                  {section.name} - {section.level}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="level" className="block text-sm font-medium leading-6 text-gray-900">
            Nivel
          </label>
          <select
            id="level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
          >
            <option value="">Seleccione Nivel</option>
            {sections?.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300"
      >
        <DocumentArrowDownIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
        Descargar Plantilla Excel
      </button>
    </div>
  );
}
