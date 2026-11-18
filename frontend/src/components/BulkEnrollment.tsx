import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrollmentService } from '../services/enrollmentService';
import { schoolYearService } from '../services/schoolYearService';
import { sectionService } from '../services/sectionService';
import {
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import type { SiagieCommitData, SiagiePreviewData, ResetPreviewData } from '@/types/enrollment';

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

const VERDE = '#538f65';

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-gray-50 border-gray-100 text-gray-900',
    ok: 'bg-green-50 border-green-100 text-green-700',
    warn: 'bg-amber-50 border-amber-100 text-amber-700',
    danger: 'bg-red-50 border-red-100 text-red-700',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-70 font-semibold">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

/** Descarga una matriz de datos como CSV compatible con Excel. */
function descargarCSV(nombre: string, filas: Array<Array<string | number>>) {
  const escapar = (valor: string | number) => {
    const texto = String(valor ?? '');
    return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = filas.map((fila) => fila.map(escapar).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function descargarJSON(nombre: string, datos: any) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function BulkEnrollment() {
  const [tab, setTab] = useState<'plantilla' | 'siagie'>('plantilla');

  // ── Plantilla propia ────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
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

  // ── SIAGIE ──────────────────────────────────────────────────────────────
  const [schoolYearId, setSchoolYearId] = useState('');
  const [siagieFile, setSiagieFile] = useState<File | null>(null);
  const [crearSecciones, setCrearSecciones] = useState(true);
  const [incluirTrasladados, setIncluirTrasladados] = useState(false);
  const [preview, setPreview] = useState<SiagiePreviewData | null>(null);
  const [resultado, setResultado] = useState<SiagieCommitData | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Año académico por defecto: el activo
  useEffect(() => {
    if (schoolYearId || !schoolYears?.length) return;
    const activo = schoolYears.find((anio) => anio.status === 'Activo');
    setSchoolYearId(activo?.id || schoolYears[0].id);
  }, [schoolYears, schoolYearId]);

  // ── Reinicio de estudiantes ─────────────────────────────────────────────
  const [resetAbierto, setResetAbierto] = useState(false);
  const [resetPreview, setResetPreview] = useState<ResetPreviewData | null>(null);
  const [fraseReset, setFraseReset] = useState('');
  const [reseteando, setReseteando] = useState(false);

  const bulkEnrollmentMutation = useMutation({
    mutationFn: enrollmentService.bulkEnrollStudents,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(data.msg || 'Matrículas masivas creadas exitosamente.');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Error al realizar la matrícula masiva.');
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
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const ws = workbook.Sheets[workbook.SheetNames[0]];

      const schoolYearName = ws['C7']?.v;
      const sectionName = ws['C8']?.v;

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

    const institutionName = institutionData?.name || 'Institución Educativa';

    const ws_data = [
      [institutionName],
      [],
      ['DATOS GENERALES:'],
      [],
      ['Institución educativa:', '', institutionName],
      ['Nivel:', '', selectedLevel],
      ['Nombre:', '', ''],
      ['Datos referentes al registro de notas:'],
      ['Año académico:', '', schoolYears?.find((y) => y.id === selectedSchoolYear)?.name || ''],
      ['Grado y Seccion:', '', sections?.find((s) => s.id === selectedSection)?.name || ''],
      [],
      [],
      ['NOMBRES', 'APELLIDOS', 'DNI', 'GENERO', 'FECHA_NAC'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
      { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrícula');
    XLSX.writeFile(wb, 'plantilla_matricula.xlsx');
  };

  // ── Handlers SIAGIE ─────────────────────────────────────────────────────
  function invalidarPreview() {
    setPreview(null);
    setResultado(null);
  }

  async function handleAnalizar() {
    if (!siagieFile) {
      toast.error('Selecciona el archivo Excel exportado por SIAGIE.');
      return;
    }
    if (!schoolYearId) {
      toast.error('Selecciona el año académico de destino.');
      return;
    }

    setAnalizando(true);
    setResultado(null);
    try {
      const data = await enrollmentService.previewSiagie(siagieFile, schoolYearId, {
        crearSeccionesFaltantes: crearSecciones,
        incluirTrasladados,
      });
      setPreview(data);
      if (data.faltantes.length > 0) {
        toast.warning(`Faltan ${data.faltantes.length} sección(es): ${data.faltantes.join(', ')}`);
      } else {
        toast.success(`Archivo analizado: ${data.totalFilas} filas.`);
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo analizar el archivo.');
    } finally {
      setAnalizando(false);
    }
  }

  async function handleImportar() {
    if (!siagieFile || !preview) return;
    setImportando(true);
    try {
      const data = await enrollmentService.commitSiagie(siagieFile, schoolYearId, {
        crearSeccionesFaltantes: crearSecciones,
        incluirTrasladados,
      });
      setResultado(data);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(
        `Importación completada: ${data.resumen.matriculados} matrícula(s) creada(s).` +
          (data.resumen.errores > 0 ? ` ${data.resumen.errores} incidencia(s).` : '')
      );
    } catch (error: any) {
      toast.error(error.message || 'No se pudo importar el archivo.');
    } finally {
      setImportando(false);
    }
  }

  function descargarIncidencias() {
    if (!resultado) return;
    const filas: Array<Array<string | number>> = [
      ['Fila', 'Documento', 'Mensaje'],
      ...resultado.errores.map((e) => [e.fila, e.documento, e.mensaje]),
    ];
    descargarCSV(`incidencias_siagie_${new Date().toISOString().slice(0, 10)}.csv`, filas);
  }

  // ── Handlers reset ──────────────────────────────────────────────────────
  async function abrirReset() {
    setResetAbierto(true);
    if (resetPreview) return;
    try {
      const data = await enrollmentService.previewReset();
      setResetPreview(data);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo consultar el estado de los datos.');
    }
  }

  async function handleReset() {
    if (!resetPreview) return;
    setReseteando(true);
    try {
      const data = await enrollmentService.resetStudents(fraseReset);
      if (data.backup) {
        descargarJSON(
          `backup-estudiantes-${new Date().toISOString().slice(0, 10)}.json`,
          data.backup
        );
      }
      toast.success(
        `Reinicio completado: ${data.resumen.estudiantes} estudiante(s) eliminado(s).`
      );
      setFraseReset('');
      setPreview(null);
      setResultado(null);
      setResetPreview({
        resumen: {
          estudiantes: 0,
          matriculas: 0,
          asistencias: 0,
          detallesAsistencia: 0,
          deudas: 0,
          transacciones: 0,
          dniEscolar: 0,
          eventos: 0,
          incidentes: 0,
          seccionesAReiniciar: resetPreview.resumen.seccionesAReiniciar,
        },
        fraseConfirmacion: resetPreview.fraseConfirmacion,
      });
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo reiniciar los datos.');
    } finally {
      setReseteando(false);
    }
  }

  const totalAMatricular = preview
    ? preview.resumen.nuevos + preview.resumen.existentesNuevos
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Tabs ── */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: 'plantilla' as const, label: 'Plantilla propia' },
          { id: 'siagie' as const, label: 'SIAGIE' },
        ].map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            onClick={() => setTab(opcion.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === opcion.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      {tab === 'plantilla' && (
        <>
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
                    schoolYears?.map((year) => (
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
                    sections?.map((s) => (
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

          <div className="border-t border-gray-100" />

          {/* ── Step 2: Upload ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              2. Sube el archivo completado
            </p>

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
                style={{ background: VERDE }}
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                {bulkEnrollmentMutation.isPending ? 'Procesando...' : 'Subir y Matricular'}
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'siagie' && (
        <div className="space-y-6">
          {/* ── Paso 1: archivo y año ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              1. Sube el reporte "Relación de estudiantes y apoderados" de SIAGIE
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label="Año académico de destino">
                <select
                  value={schoolYearId}
                  onChange={(e) => {
                    setSchoolYearId(e.target.value);
                    invalidarPreview();
                  }}
                  className={selectCls}
                >
                  <option value="">Seleccionar año</option>
                  {isLoadingSchoolYears ? (
                    <option>Cargando...</option>
                  ) : (
                    schoolYears?.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.status === 'Activo' ? '(activo)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Archivo SIAGIE">
                <label className="flex items-center justify-between gap-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors">
                  <span className="truncate text-gray-600">
                    {siagieFile ? siagieFile.name : 'Seleccionar .xlsx'}
                  </span>
                  <CloudArrowUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      setSiagieFile(e.target.files?.[0] ?? null);
                      invalidarPreview();
                    }}
                    className="hidden"
                  />
                </label>
              </Field>
            </div>

            <div className="flex flex-wrap gap-5 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={crearSecciones}
                  onChange={(e) => {
                    setCrearSecciones(e.target.checked);
                    invalidarPreview();
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Crear las secciones que falten
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={incluirTrasladados}
                  onChange={(e) => {
                    setIncluirTrasladados(e.target.checked);
                    invalidarPreview();
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Incluir alumnos con estado TRASLADADO
              </label>
            </div>

            <button
              type="button"
              onClick={handleAnalizar}
              disabled={!siagieFile || !schoolYearId || analizando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-40"
              style={{ background: VERDE }}
            >
              <DocumentTextIcon className="w-4 h-4" />
              {analizando ? 'Analizando…' : 'Analizar archivo'}
            </button>
          </div>

          {/* ── Paso 2: preview ── */}
          {preview && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-gray-900">
                  Vista previa — {preview.meta.nombreIE || 'Institución educativa'}
                  {preview.meta.anioTitulo ? ` · ${preview.meta.anioTitulo}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="Filas" value={preview.totalFilas} />
                <Stat label="Por matricular" value={totalAMatricular} tone="ok" />
                <Stat label="Ya matriculados" value={preview.resumen.yaMatriculados} />
                <Stat
                  label="Trasladados"
                  value={preview.resumen.omitidosTrasladados}
                  tone="warn"
                />
                <Stat label="Conflictos" value={preview.resumen.conflictos} tone="danger" />
                <Stat label="Sin sección" value={preview.resumen.sinSeccion} tone="danger" />
              </div>

              {preview.faltantes.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 text-sm rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Secciones no encontradas: <strong>{preview.faltantes.join(', ')}</strong>.{' '}
                    {crearSecciones
                      ? 'Se crearán automáticamente al importar.'
                      : 'Activa "crear las secciones que falten" para continuar.'}
                  </span>
                </div>
              )}

              {preview.excedidas.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 text-sm rounded-xl bg-red-50 border border-red-200 text-red-700">
                  <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Superan la capacidad: <strong>{preview.excedidas.join(', ')}</strong>. Las
                    filas que no tengan cupo se reportarán como incidencia.
                  </span>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-semibold">Sección</th>
                      <th className="px-4 py-2 font-semibold text-right">Matriculados</th>
                      <th className="px-4 py-2 font-semibold text-right">Por matricular</th>
                      <th className="px-4 py-2 font-semibold text-right">Total</th>
                      <th className="px-4 py-2 font-semibold text-right">Capacidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.secciones.map((seccion) => (
                      <tr key={seccion.clave}>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {seccion.nombre}
                          {!seccion.existe && (
                            <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              nueva
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">{seccion.matriculados}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-900 font-semibold">{seccion.porMatricular}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">{seccion.resultante}</td>
                        <td className={`px-4 py-2 text-right tabular-nums ${seccion.excedeCapacidad ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {seccion.capacidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.advertencias.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 font-semibold">
                    Advertencias del archivo ({preview.advertencias.length})
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-48 overflow-auto pr-2">
                    {preview.advertencias.map((adv, i) => (
                      <li key={`${adv.fila}-${i}`} className="text-gray-600">
                        <span className="font-mono text-xs text-gray-400">Fila {adv.fila}:</span>{' '}
                        {adv.mensaje}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleImportar}
                  disabled={importando || totalAMatricular === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-40"
                  style={{ background: VERDE }}
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                  {importando
                    ? 'Importando…'
                    : `Importar y matricular ${totalAMatricular} estudiante(s)`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    invalidarPreview();
                    setSiagieFile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 3: resultado ── */}
          {resultado && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-gray-900">Resultado de la importación</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="Matriculados" value={resultado.resumen.matriculados} tone="ok" />
                <Stat label="Usuarios creados" value={resultado.resumen.usuariosCreados} />
                <Stat label="Actualizados" value={resultado.resumen.usuariosActualizados} />
                <Stat label="Secciones creadas" value={resultado.resumen.seccionesCreadas} />
                <Stat label="Omitidos" value={resultado.resumen.omitidosTrasladados} tone="warn" />
                <Stat label="Errores" value={resultado.resumen.errores} tone="danger" />
              </div>

              {resultado.errores.length > 0 && (
                <div className="space-y-2">
                  <div className="overflow-x-auto rounded-xl border border-red-100 max-h-56 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-red-50 sticky top-0">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-red-700">
                          <th className="px-4 py-2 font-semibold">Fila</th>
                          <th className="px-4 py-2 font-semibold">Documento</th>
                          <th className="px-4 py-2 font-semibold">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50">
                        {resultado.errores.map((error, i) => (
                          <tr key={`${error.fila}-${i}`}>
                            <td className="px-4 py-2 tabular-nums text-gray-600">{error.fila}</td>
                            <td className="px-4 py-2 font-mono text-xs text-gray-700">{error.documento}</td>
                            <td className="px-4 py-2 text-gray-700">{error.mensaje}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={descargarIncidencias}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Descargar incidencias (CSV)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Zona de riesgo: reinicio de estudiantes ── */}
          <div className="border-t border-gray-100 pt-5">
            {!resetAbierto ? (
              <button
                type="button"
                onClick={abrirReset}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reiniciar datos de estudiantes…
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      Borrar todos los estudiantes y sus registros
                    </p>
                    <p className="text-xs text-red-600/80 mt-1">
                      Elimina alumnos, matrículas, asistencia, deudas, pagos, DNI escolar,
                      incidencias y asistencia a eventos. No toca docentes, secciones, cursos ni
                      inventario. Se descargará un backup JSON antes de borrar.
                    </p>
                  </div>
                </div>

                {resetPreview && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white rounded-lg border border-red-100 px-3 py-2">
                      <span className="block text-gray-500">Estudiantes</span>
                      <strong className="text-gray-900 tabular-nums">{resetPreview.resumen.estudiantes}</strong>
                    </div>
                    <div className="bg-white rounded-lg border border-red-100 px-3 py-2">
                      <span className="block text-gray-500">Matrículas</span>
                      <strong className="text-gray-900 tabular-nums">{resetPreview.resumen.matriculas}</strong>
                    </div>
                    <div className="bg-white rounded-lg border border-red-100 px-3 py-2">
                      <span className="block text-gray-500">Deudas</span>
                      <strong className="text-gray-900 tabular-nums">{resetPreview.resumen.deudas}</strong>
                    </div>
                    <div className="bg-white rounded-lg border border-red-100 px-3 py-2">
                      <span className="block text-gray-500">Asistencias</span>
                      <strong className="text-gray-900 tabular-nums">{resetPreview.resumen.asistencias}</strong>
                    </div>
                  </div>
                )}

                <Field label={`Escribe "${resetPreview?.fraseConfirmacion || 'BORRAR ESTUDIANTES'}" para confirmar`}>
                  <input
                    type="text"
                    value={fraseReset}
                    onChange={(e) => setFraseReset(e.target.value)}
                    placeholder="BORRAR ESTUDIANTES"
                    className="w-full px-3 py-2 text-sm bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400"
                  />
                </Field>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={
                      reseteando ||
                      fraseReset.trim().toUpperCase() !==
                        (resetPreview?.fraseConfirmacion || 'BORRAR ESTUDIANTES')
                    }
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    {reseteando ? 'Borrando…' : 'Borrar y descargar backup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetAbierto(false);
                      setFraseReset('');
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
