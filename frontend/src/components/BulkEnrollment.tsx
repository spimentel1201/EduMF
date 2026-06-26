import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { enrollmentService } from '../services/enrollmentService';
import { schoolYearService } from '../services/schoolYearService';
import { sectionService } from '../services/sectionService';
import { CloudArrowUpIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';

// ── Reusable field wrapper ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const selectCls =
  'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';

export default function BulkEnrollment() {
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLevel, setSelectedLevel]     = useState('');
  const queryClient = useQueryClient();

  const { data: institutionData } = useInstitutionSettings();

  const { data: schoolYears, isLoading: isLoadingSchoolYears } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const bulkEnrollmentMutation = useMutation({
    mutationFn: enrollmentService.bulkEnrollStudents,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(data.msg || 'Matrículas masivas creadas exitosamente.');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al realizar la matrícula masiva.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecciona un archivo para subir.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data     = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const ws       = workbook.Sheets[workbook.SheetNames[0]];

      const schoolYearName = ws['C7']?.v;
      const sectionName    = ws['C8']?.v;

      if (!schoolYearName || !sectionName) {
        toast.error('Faltan datos generales (Año académico o Grado y Sección) en el archivo.');
        setSelectedFile(null);
        return;
      }

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
      toast.error('Selecciona Año Académico, Sección y Nivel para descargar la plantilla.');
      return;
    }

    // Institution name for header (row 1)
    const institutionName = institutionData?.name || 'Institución Educativa';

    const ws_data = [
      [institutionName],                                                          // Row 1: institution name
      [],                                                                         // Row 2: blank
      ['DATOS GENERALES:'],                                                       // Row 3
      [],                                                                         // Row 4
      ['Institución educativa:', '', institutionName],                            // Row 5
      ['Nivel:', '', selectedLevel],                                              // Row 6
      ['Nombre:', '', ''],                                                        // Row 7
      ['Datos referentes al registro de notas:'],                                 // Row 8
      ['Año académico:', '', schoolYears?.find((y) => y.id === selectedSchoolYear)?.name || ''], // Row 9
      ['Grado y Seccion:', '', sections?.find((s) => s.id === selectedSection)?.name || ''],    // Row 10
      [],                                                                         // Row 11
      [],                                                                         // Row 12
      ['NOMBRES', 'APELLIDOS', 'DNI', 'GENERO', 'FECHA_NAC'],                   // Row 13
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },  // Institution name
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },  // DATOS GENERALES
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },  // Institución educativa label
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },  // Nivel label
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },  // Nombre label
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },  // Datos referentes
      { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },  // Año académico label
      { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },  // Grado y Sección label
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrícula');
    XLSX.writeFile(wb, 'plantilla_matricula.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* ── Step 1: Selectors for template download ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          1. Configura y descarga la plantilla
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Año Académico">
            <select
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccionar año</option>
              {isLoadingSchoolYears ? (
                <option>Cargando...</option>
              ) : (
                schoolYears?.map((year: any) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))
              )}
            </select>
          </Field>

          <Field label="Sección">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccionar sección</option>
              {isLoadingSections ? (
                <option>Cargando...</option>
              ) : (
                sections?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.level}</option>
                ))
              )}
            </select>
          </Field>

          <Field label="Nivel">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccionar nivel</option>
              {['Inicial', 'Primaria', 'Secundaria'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Descargar Plantilla Excel
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-gray-100" />

      {/* ── Step 2: Upload ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          2. Sube el archivo completado
        </p>

        {/* Drop zone */}
        <label className="flex flex-col items-center justify-center gap-3 w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors">
          <CloudArrowUpIcon className="w-7 h-7 text-gray-300" />
          <span className="text-sm text-gray-500">
            {selectedFile ? (
              <span className="font-semibold text-green-700">{selectedFile.name}</span>
            ) : (
              <>Haz clic o arrastra un archivo <span className="font-semibold">.xlsx / .xls / .csv</span></>
            )}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Selected file pill */}
        {selectedFile && (
          <div className="flex items-center justify-between mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <span className="truncate">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="ml-2 flex-shrink-0">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || bulkEnrollmentMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-40"
            style={{ background: '#538f65' }}
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            {bulkEnrollmentMutation.isPending ? 'Procesando...' : 'Subir y Matricular'}
          </button>
        </div>
      </div>
    </div>
  );
}
