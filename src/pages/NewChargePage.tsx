import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { treasuryService } from '../services/treasuryService';

const FIELD_CLASS =
  'w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors text-gray-800 placeholder-gray-400';
const LABEL_CLASS = 'block text-xs font-bold text-gray-600 mb-2 mt-4 first:mt-0';

// ─── Helpers de días laborables ───────────────────────────────────────────────

function isWorkday(d: Date): boolean {
  return d.getDay() !== 0 && d.getDay() !== 6;
}

function nextWorkday(date: Date): Date {
  const d = new Date(date);
  while (!isWorkday(d)) d.setDate(d.getDate() + 1);
  return d;
}

/** Devuelve los 5 días laborables (Lun-Vie) de la semana que contiene `date` */
function workdaysOfWeek(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Devuelve todos los días laborables del mes desde startDate hasta fin de mes */
function workdaysOfMonth(startDate: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(startDate);
  const month = d.getMonth();
  while (d.getMonth() === month) {
    if (isWorkday(d)) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Calcula las fechas de vencimiento según frecuencia */
function calcDueDates(startDateStr: string, frecuencia: string): Date[] {
  if (!startDateStr) return [];
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = nextWorkday(new Date(y, m - 1, d));
  switch (frecuencia) {
    case 'Semanal':  return workdaysOfWeek(start);
    case 'Mensual':  return workdaysOfMonth(start);
    case 'Diario':   return [start];
    default:         return [start]; // Un solo pago
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NewChargePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    frecuencia: 'Un solo pago',
    alcance: 'General',
    grado: '',
    seccion: '',
    startDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FRECUENCIAS = [
    { value: 'Un solo pago', label: t('payments.new.frequencies.oneTime') },
    { value: 'Diario',       label: t('payments.new.frequencies.daily') },
    { value: 'Semanal',      label: t('payments.new.frequencies.weekly') },
    { value: 'Mensual',      label: t('payments.new.frequencies.monthly') },
  ];

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Cálculo dinámico de fechas de vencimiento ─────────────────────────────
  const dueDates = useMemo(
    () => calcDueDates(form.startDate, form.frecuencia),
    [form.startDate, form.frecuencia]
  );

  // Para "Un solo pago" la fecha es hoy (laborable)
  const resolvedDueDates = useMemo(() => {
    if (form.frecuencia === 'Un solo pago') return [nextWorkday(new Date())];
    return dueDates;
  }, [form.frecuencia, dueDates]);

  const debtCountPerStudent = resolvedDueDates.length;

  const frecuenciaDesc: Record<string, string> = {
    'Un solo pago': '1 cobro por alumno',
    'Diario':       '1 cobro por alumno (dia laborable)',
    'Semanal':      `${debtCountPerStudent} cobros por alumno (Lun-Vie de la semana)`,
    'Mensual':      `${debtCountPerStudent} cobros por alumno (dias laborables del mes)`,
  };

  // ── Proyección total ──────────────────────────────────────────────────────
  const STUDENT_COUNT = 452;
  const totalProjection = form.monto && debtCountPerStudent > 0
    ? (parseFloat(form.monto) * STUDENT_COUNT * debtCountPerStudent).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError(null);

    if (!form.concepto.trim()) {
      setError('El concepto es requerido.');
      return;
    }
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }
    if (form.frecuencia !== 'Un solo pago' && !form.startDate) {
      setError('La fecha de inicio es requerida para frecuencias recurrentes.');
      return;
    }
    if (form.alcance === 'Especifico' && (!form.grado || !form.seccion)) {
      setError('Debes seleccionar grado y sección para el alcance específico.');
      return;
    }

    // La fecha que se envía al backend es la fecha de inicio (el backend calcula las fechas por frecuencia)
    const startDate = form.frecuencia === 'Un solo pago'
      ? nextWorkday(new Date()).toISOString()
      : new Date(form.startDate + 'T12:00:00').toISOString();

    try {
      setLoading(true);
      const result = await treasuryService.bulkCreateDebts({
        concept: form.concepto,
        amount: parseFloat(form.monto).toFixed(2),
        dueDate: startDate,
        frecuencia: form.frecuencia,
        grade: form.alcance === 'Especifico' ? form.grado : undefined,
        section: form.alcance === 'Especifico' ? form.seccion : undefined,
      });

      if (result.errors.length > 0 && result.created === 0) {
        setError(`No se pudo generar ningún cobro: ${result.errors[0]}`);
        return;
      }

      navigate('/payments', {
        state: { successMessage: `Se generaron ${result.created} cobros exitosamente.` },
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Error al generar los cobros. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans text-gray-800">
      <div className="mb-8">
        <h1 className="text-[1.8rem] font-bold text-[#1a202c]">{t('payments.new.title')}</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">{t('payments.new.desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1: Detalles del Pago */}
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <DocumentTextIcon className="w-6 h-6 text-[#538f65]" />
              <h2 className="text-lg font-bold text-[#538f65]">{t('payments.new.detailsTitle')}</h2>
            </div>

            <div>
              <label className={LABEL_CLASS}>{t('payments.new.conceptLabel')}</label>
              <input
                type="text"
                placeholder={t('payments.new.conceptPlaceholder')}
                value={form.concepto}
                onChange={set('concepto')}
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">S/</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.monto}
                    onChange={set('monto')}
                    className={`${FIELD_CLASS} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>{t('payments.new.frequencyLabel')}</label>
                <div className="flex bg-[#EBE8DD] p-1 rounded-xl">
                  {FRECUENCIAS.map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, frecuencia: freq.value }))}
                      className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-lg transition-colors ${
                        form.frecuencia === freq.value
                          ? 'bg-[#538f65] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fecha de inicio — solo para frecuencias recurrentes */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 transition-all duration-300 ${
                form.frecuencia !== 'Un solo pago' ? 'opacity-100' : 'hidden'
              }`}
            >
              <div className="sm:col-span-1">
                <label className={LABEL_CLASS}>{t('payments.new.startDateLabel')}</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className={FIELD_CLASS}
                />
                {/* Indicador de días laborables */}
                {form.startDate && (
                  <p className="mt-1.5 text-[11px] font-semibold text-[#538f65] flex items-center gap-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    {resolvedDueDates.length === 1
                      ? `Vencimiento: ${formatDate(resolvedDueDates[0])}`
                      : `${resolvedDueDates.length} fechas: ${formatDate(resolvedDueDates[0])} — ${formatDate(resolvedDueDates[resolvedDueDates.length - 1])}`}
                  </p>
                )}
              </div>
            </div>

            {/* Mensaje informativo sobre días laborables */}
            {form.frecuencia !== 'Un solo pago' && (
              <p className="mt-4 text-[11px] text-gray-500 bg-[#EBE8DD] rounded-xl px-4 py-2.5 flex items-start gap-2">
                <CalendarDaysIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#538f65]" />
                Las fechas de vencimiento se calculan contando solo días laborables
                (lunes a viernes). Los fines de semana se omiten automáticamente.
              </p>
            )}
          </div>

          {/* Card 2: Alcance del Cobro */}
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <UserGroupIcon className="w-6 h-6 text-[#538f65]" />
              <h2 className="text-lg font-bold text-[#538f65]">{t('payments.new.scopeTitle')}</h2>
            </div>

            <div className="flex flex-wrap gap-4 bg-[#F2F0E6] p-2 rounded-2xl mb-6">
              {(['General', 'Especifico'] as const).map((val) => (
                <label
                  key={val}
                  className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl border cursor-pointer transition-colors ${
                    form.alcance === val
                      ? 'border-[#538f65] bg-white shadow-sm'
                      : 'border-transparent text-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      form.alcance === val ? 'border-[#538f65]' : 'border-gray-300'
                    }`}
                  >
                    {form.alcance === val && (
                      <div className="w-2.5 h-2.5 bg-[#538f65] rounded-full" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="alcance"
                    className="hidden"
                    checked={form.alcance === val}
                    onChange={() => setForm((p) => ({ ...p, alcance: val }))}
                  />
                  <span className="text-sm font-bold">
                    {val === 'General'
                      ? t('payments.new.scopeGeneral')
                      : t('payments.new.scopeSpecific')}
                  </span>
                </label>
              ))}
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-opacity ${
                form.alcance === 'General' ? 'opacity-50 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.gradeLabel')}</label>
                <select value={form.grado} onChange={set('grado')} className={FIELD_CLASS}>
                  <option value="">{t('payments.new.gradePlaceholder')}</option>
                  <option value="1">1er Grado</option>
                  <option value="2">2do Grado</option>
                  <option value="3">3er Grado</option>
                  <option value="4">4to Grado</option>
                  <option value="5">5to Grado</option>
                  <option value="6">6to Grado</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.sectionLabel')}</label>
                <select value={form.seccion} onChange={set('seccion')} className={FIELD_CLASS}>
                  <option value="">{t('payments.new.sectionPlaceholder')}</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error global */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* ── Columna derecha: Resumen dinámico ── */}
        <div className="space-y-6">
          <div className="bg-[#1C1F1E] rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-lg">
            <h2 className="text-xl font-bold mb-8">{t('payments.new.resumeTitle')}</h2>

            <div className="space-y-5 mb-8">
              {/* Estudiantes afectados */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-gray-400">{t('payments.new.affectedStudents')}</span>
                <span className="text-lg font-bold">
                  {form.alcance === 'General' ? STUDENT_COUNT : '—'}
                </span>
              </div>

              {/* Cobros por alumno */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-gray-400">Cobros por alumno</span>
                <span className="text-sm font-bold text-[#6CA07C]">
                  {debtCountPerStudent}
                </span>
              </div>

              {/* Proyección total */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-gray-400">{t('payments.new.totalProjection')}</span>
                <span className="text-lg font-bold text-[#6CA07C]">
                  S/ {form.alcance === 'General' ? totalProjection : '—'}
                </span>
              </div>

              {/* Frecuencia */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-gray-400">Frecuencia</span>
                <span className="text-sm font-bold text-white">
                  {FRECUENCIAS.find((f) => f.value === form.frecuencia)?.label ?? '—'}
                </span>
              </div>

              {/* Descripción de cobros generados */}
              <div className="flex items-start gap-2 pb-2">
                <CalendarDaysIcon className="w-4 h-4 text-[#538f65] shrink-0 mt-0.5" />
                <span className="text-[11px] text-gray-400 leading-relaxed">
                  {frecuenciaDesc[form.frecuencia]}
                </span>
              </div>

              {/* Preview de fechas (Semanal/Mensual) */}
              {(form.frecuencia === 'Semanal' || form.frecuencia === 'Mensual') && resolvedDueDates.length > 0 && (
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Fechas de vencimiento ({resolvedDueDates.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {resolvedDueDates.slice(0, 10).map((d, i) => (
                      <span key={i} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                        {formatDate(d)}
                      </span>
                    ))}
                    {resolvedDueDates.length > 10 && (
                      <span className="text-[10px] text-gray-500">+{resolvedDueDates.length - 10} más</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#538f65] hover:bg-[#3f7350] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
                {loading ? 'Generando...' : t('payments.new.generateBtn')}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-4 leading-relaxed font-medium">
                {t('payments.new.notice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
