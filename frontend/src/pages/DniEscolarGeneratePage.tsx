import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  MapPinIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { dniEscolarService } from '@/services/dniEscolarService';
import { schoolYearService } from '@/services/schoolYearService';
import { sectionService } from '@/services/sectionService';
import type {
  GenerarDesdeMatriculaResult,
  StudentBySection,
} from '@/types/dniEscolar';

const DEFAULTS_UBICACION = {
  departamento: 'AREQUIPA',
  provincia: 'ISLAY',
  distrito: 'DEAN VALDIVIA',
  direccion: 'I.E. FRANCISCO LOPEZ DE ROMAÑA (Prolongación Guardiola S/N La Curva)',
};

const inputCls =
  'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';

function nombreCompleto(student: StudentBySection): string {
  return `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim();
}

export default function DniEscolarGeneratePage() {
  const queryClient = useQueryClient();

  const [schoolYearId, setSchoolYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState(DEFAULTS_UBICACION);
  const [result, setResult] = useState<GenerarDesdeMatriculaResult | null>(null);

  const { data: years = [] } = useQuery({
    queryKey: ['school-years'],
    queryFn: schoolYearService.getAll,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getAll(),
  });

  const sectionsOfYear = useMemo(
    () => sections.filter((section) => section.schoolYearId === schoolYearId),
    [sections, schoolYearId]
  );

  useEffect(() => {
    if (!schoolYearId && years.length > 0) {
      const current =
        years.find((year) => (year as any).status === 'active') || years[0];
      if (current) setSchoolYearId(current.id);
    }
  }, [years, schoolYearId]);

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<StudentBySection[]>({
    queryKey: ['section-students', sectionId],
    queryFn: () => dniEscolarService.getStudentsBySection(sectionId),
    enabled: Boolean(sectionId),
  });

  // Al cambiar de sección, todos quedan seleccionados por defecto
  useEffect(() => {
    setSelected(students.map((student) => student._id));
  }, [students]);

  const generateMutation = useMutation({
    mutationFn: () =>
      dniEscolarService.generarDesdeMatricula({
        sectionId,
        studentIds: selected,
        anio: new Date().getFullYear(),
        departamento: ubicacion.departamento,
        provincia: ubicacion.provincia,
        distrito: ubicacion.distrito,
        direccion: ubicacion.direccion,
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['dni-escolar'] });
      queryClient.invalidateQueries({ queryKey: ['dni-escolar-stats'] });
      toast.success(`${data.creados} DNIs generados`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo generar los DNIs');
    },
  });

  const allSelected = students.length > 0 && selected.length === students.length;

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div>
        <Link
          to="/dni-escolar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Volver a DNIs escolares
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
          Generar DNIs desde la matrícula
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
          Toma los estudiantes matriculados y crea sus DNIs con los datos del sistema.
          Los que ya tienen DNI se omiten automáticamente.
        </p>
      </div>

      {/* Paso 1 · Ubicación del reverso */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
            1
          </span>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1a202c' }}>
              <MapPinIcon className="w-4 h-4" style={{ color: '#538f65' }} />
              Ubicación para el reverso
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Es la misma para todos los estudiantes (ubicación de la I.E.). Podrás editarla
              por estudiante después.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              ['departamento', 'Departamento'],
              ['provincia', 'Provincia'],
              ['distrito', 'Distrito'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <input
                value={ubicacion[key]}
                onChange={(e) => setUbicacion((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Dirección
            </label>
            <input
              value={ubicacion.direccion}
              onChange={(e) => setUbicacion((prev) => ({ ...prev, direccion: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Paso 2 · Matrícula */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
            2
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1a202c' }}>
              <UserGroupIcon className="w-4 h-4" style={{ color: '#538f65' }} />
              Selecciona año escolar y sección
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Los estudiantes se cargan desde la matrícula registrada en el sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Año escolar
            </label>
            <select
              value={schoolYearId}
              onChange={(e) => {
                setSchoolYearId(e.target.value);
                setSectionId('');
                setResult(null);
              }}
              className={inputCls}
            >
              <option value="">Selecciona un año…</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {(year as any).status === 'active' ? ' (activo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Sección
            </label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setResult(null);
              }}
              disabled={!schoolYearId}
              className={`${inputCls} disabled:opacity-50`}
            >
              <option value="">
                {schoolYearId ? 'Selecciona una sección…' : 'Elige primero un año'}
              </option>
              {sectionsOfYear.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.level} · {section.grade} {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sectionId && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">
                {isLoadingStudents
                  ? 'Cargando estudiantes…'
                  : `${selected.length} de ${students.length} seleccionados`}
              </p>
              <button
                onClick={() => setSelected(allSelected ? [] : students.map((s) => s._id))}
                disabled={students.length === 0}
                className="text-xs font-semibold text-[#538f65] hover:underline disabled:opacity-40"
              >
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl">
              {isLoadingStudents &&
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-4 py-3 animate-pulse">
                    <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  </div>
                ))}

              {!isLoadingStudents && students.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Esta sección no tiene estudiantes matriculados.
                </div>
              )}

              {students.map((student) => {
                const checked = selected.includes(student._id);
                return (
                  <label
                    key={student._id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'bg-green-50/50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(student._id)}
                      className="w-4 h-4 accent-[#538f65]"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                      {nombreCompleto(student)}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {student.dni || 'sin DNI'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Paso 3 · Generar */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
              3
            </span>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1a202c' }}>
                <SparklesIcon className="w-4 h-4" style={{ color: '#538f65' }} />
                Generar los DNIs
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Fechas por defecto: inscripción y emisión hoy · caducidad +3 años.
              </p>
            </div>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={!sectionId || selected.length === 0 || generateMutation.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            style={{ background: '#538f65' }}
          >
            {generateMutation.isPending
              ? 'Generando…'
              : `Generar ${selected.length} DNIs`}
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50/60 p-4">
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              {result.creados} DNIs generados correctamente
            </p>

            {result.omitidos.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {result.omitidos.length} estudiantes omitidos
                </p>
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {result.omitidos.map((omission, index) => (
                    <li key={`${omission.nombre}-${index}`} className="text-[11px] text-amber-700">
                      <span className="font-semibold">{omission.nombre}</span>: {omission.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <Link
                to="/dni-escolar"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#538f65' }}
              >
                <IdentificationIcon className="w-4 h-4" />
                Ver DNIs generados
              </Link>
              <Link
                to="/dni-escolar/print"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Imprimir tarjetas
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
