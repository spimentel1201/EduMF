import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
  eventService,
  EventDTO,
  SaveAttendanceEntry,
} from '../services/eventService';

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'absent' | null;
type TutorPresence   = 'padre' | 'madre' | 'apoderado' | null;

interface StudentRecord {
  id: string;
  name: string;       // "Apellido, Nombre" format
  studentId: string;  // e.g. "2024-0042"
  grade: string;
  section: string;
  attendance: AttendanceStatus;
  tutorPresence: TutorPresence;
  tutorName: string;
}

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(',')
    .reverse()
    .map((n) => n.trim()[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Asistió / Faltó toggle */
function AttendanceToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (v: AttendanceStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(value === 'present' ? null : 'present')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          value === 'present'
            ? 'text-white border-transparent shadow-sm'
            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
        }`}
        style={value === 'present' ? { background: '#538f65' } : {}}
      >
        Asistió
      </button>
      <button
        onClick={() => onChange(value === 'absent' ? null : 'absent')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          value === 'absent'
            ? 'bg-red-600 text-white border-transparent shadow-sm'
            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
        }`}
      >
        Faltó
      </button>
    </div>
  );
}

/** PADRE / MADRE / APOD. toggle */
function TutorToggle({
  value,
  disabled,
  onChange,
}: {
  value: TutorPresence;
  disabled: boolean;
  onChange: (v: TutorPresence) => void;
}) {
  if (disabled) {
    return <span className="text-sm text-gray-300 px-2">—</span>;
  }

  const options: { key: TutorPresence; label: string }[] = [
    { key: 'padre',      label: 'PADRE' },
    { key: 'madre',      label: 'MADRE' },
    { key: 'apoderado',  label: 'APOD.' },
  ];

  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.key!}
          onClick={() => onChange(value === opt.key ? null : opt.key)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            value === opt.key
              ? 'text-white border-transparent shadow-sm'
              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
          style={
            value === opt.key
              ? {
                  background:
                    opt.key === 'padre'
                      ? '#4a7c59'
                      : opt.key === 'madre'
                      ? '#b7793d'
                      : '#6b8cae',
                }
              : {}
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Tutor name input */
function TutorNameField({
  value,
  tutorPresence,
  attendance,
  onChange,
}: {
  value: string;
  tutorPresence: TutorPresence;
  attendance: AttendanceStatus;
  onChange: (v: string) => void;
}) {
  if (attendance === 'absent' || tutorPresence === null) {
    return <span className="text-sm italic text-gray-300">No aplica</span>;
  }
  if (tutorPresence === 'apoderado') {
    return (
      <input
        type="text"
        placeholder="Nombre del apoderado"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors placeholder-gray-300"
      />
    );
  }
  return <span className="text-sm italic text-gray-400">—</span>;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventAttendancePage() {
  const { eventId } = useParams<{ eventId: string }>();

  // ── Event state ──
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [eventLoading, setEventLoading] = useState(true);

  // ── Records state ──
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // ── Save state ──
  const [hasSavedRecord, setHasSavedRecord] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Filter / pagination state ──
  const [gradeFilter,   setGradeFilter]   = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [page, setPage] = useState(1);

  // ── Fetch event + existing attendance on mount ──
  useEffect(() => {
    if (!eventId) return;

    setEventLoading(true);
    eventService.getEventById(eventId)
      .then((data) => setEvent(data))
      .catch((err) => console.error('Failed to load event:', err))
      .finally(() => setEventLoading(false));

    // Try to load existing attendance record
    eventService.getEventAttendance(eventId)
      .then(({ record }) => {
        if (record && Array.isArray(record.entries) && record.entries.length > 0) {
          const mapped: StudentRecord[] = record.entries.map((entry: any) => ({
            id:           entry.studentId?._id ?? entry.studentId ?? '',
            name:         entry.studentId?.lastName
                            ? `${entry.studentId.lastName}, ${entry.studentId.firstName}`
                            : entry.name ?? '',
            studentId:    entry.studentId?.dni ?? entry.studentDni ?? '',
            grade:        entry.grade ?? '',
            section:      entry.section ?? '',
            attendance:   entry.attendance ?? null,
            tutorPresence: entry.tutorPresence ?? null,
            tutorName:    entry.tutorName ?? '',
          }));
          setRecords(mapped);
          setHasSavedRecord(true);
          setStudentsLoading(false);
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status !== 404) {
          console.error('Failed to load existing attendance:', err);
        }
        // 404 → no saved record yet, fall through to load fresh student list
      });
  }, [eventId]);

  // ── Fetch students when filters change (skip if saved record already loaded) ──
  useEffect(() => {
    if (!eventId) return;
    if (hasSavedRecord) return;

    setStudentsLoading(true);
    eventService
      .getStudentsForEvent(eventId, {
        grade:   gradeFilter   !== 'all' ? gradeFilter   : undefined,
        section: sectionFilter !== 'all' ? sectionFilter : undefined,
      })
      .then((students) => {
        setRecords(students.map((s) => ({
          id:            s.id,
          name:          s.name,
          studentId:     s.studentId,
          grade:         s.grade,
          section:       s.section,
          attendance:    s.attendance,
          tutorPresence: s.tutorPresence,
          tutorName:     s.tutorName,
        })));
      })
      .catch((err) => console.error('Failed to load students:', err))
      .finally(() => setStudentsLoading(false));
  }, [eventId, gradeFilter, sectionFilter, hasSavedRecord]);

  // Derived filter options
  const grades   = ['all', ...Array.from(new Set(records.map((r) => r.grade)))];
  const sections = ['all', ...Array.from(new Set(records.map((r) => r.section)))];

  const filtered = records.filter((r) => {
    const g = gradeFilter   === 'all' || r.grade   === gradeFilter;
    const s = sectionFilter === 'all' || r.section === sectionFilter;
    return g && s;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Updaters
  const updateRecord = (id: string, patch: Partial<StudentRecord>) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.attendance === 'absent') {
          updated.tutorPresence = null;
          updated.tutorName = '';
        }
        if (patch.tutorPresence !== undefined && patch.tutorPresence !== 'apoderado') {
          updated.tutorName = '';
        }
        return updated;
      })
    );
    setSaved(false);
  };

  // Summary stats
  const present    = records.filter((r) => r.attendance === 'present').length;
  const tutorCount = records.filter((r) => r.tutorPresence !== null).length;
  const pct        = records.length ? Math.round((present / records.length) * 100) : 0;

  const handleSave = async () => {
    if (!eventId) return;
    setSaveError(null);

    const entries: SaveAttendanceEntry[] = records.map((r) => ({
      studentId:     r.id,
      attendance:    r.attendance,
      tutorPresence: r.tutorPresence,
      tutorName:     r.tutorName,
    }));

    try {
      if (hasSavedRecord) {
        await eventService.updateEventAttendance(eventId, entries);
      } else {
        await eventService.saveEventAttendance(eventId, entries);
        setHasSavedRecord(true);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Error al guardar la asistencia';
      setSaveError(msg);
    }
  };

  const isLoading = eventLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
          <p className="text-sm">Cargando datos del evento…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            to="/events"
            className="mt-1 p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: '#1a202c' }}>
              Registro de Asistencia
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
              {event?.title} • {event?.date}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {event?.timeStart} – {event?.timeEnd}
              </span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5" />
                {event?.location}
              </span>
            </div>
          </div>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:flex-shrink-0">
          {/* Grado */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">Grado</label>
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 min-w-[160px]"
            >
              <option value="all">Todos los grados</option>
              {grades.filter((g) => g !== 'all').map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sección */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">Sección</label>
            <select
              value={sectionFilter}
              onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            >
              <option value="all">Todas</option>
              {sections.filter((s) => s !== 'all').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-end gap-1 mt-4 sm:mt-0 self-end">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
                style={{ background: '#538f65' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#47795a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#538f65')}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Guardar Asistencia
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Exportar Borrador
              </button>
            </div>
            {saveError && (
              <p className="text-xs text-red-500 mt-1">{saveError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Nombre del Estudiante
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Estado de Asistencia
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Presencia de Tutor
                </th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Nombre del Tutor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Student */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: '#538f65' }}
                      >
                        {initials(r.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                        <p className="text-xs text-gray-400">ID: {r.studentId}</p>
                      </div>
                    </div>
                  </td>

                  {/* Attendance */}
                  <td className="px-5 py-3">
                    <AttendanceToggle
                      value={r.attendance}
                      onChange={(v) => updateRecord(r.id, { attendance: v })}
                    />
                  </td>

                  {/* Tutor presence */}
                  <td className="px-5 py-3">
                    <TutorToggle
                      value={r.tutorPresence}
                      disabled={r.attendance === 'absent' || r.attendance === null}
                      onChange={(v) => updateRecord(r.id, { tutorPresence: v })}
                    />
                  </td>

                  {/* Tutor name */}
                  <td className="px-5 py-3 min-w-[200px]">
                    <TutorNameField
                      value={r.tutorName}
                      tutorPresence={r.tutorPresence}
                      attendance={r.attendance}
                      onChange={(v) => updateRecord(r.id, { tutorName: v })}
                    />
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer: count + pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} estudiantes
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                style={
                  n === page
                    ? { background: '#538f65', color: '#fff' }
                    : { background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0' }
                }
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <StatsCard
          label="Total Asistentes"
          value={present}
          sub={`${pct}% de la sección`}
          icon={UserGroupIcon}
          accent="bg-green-100 text-green-700"
        />
        <StatsCard
          label="Tutores Presentes"
          value={tutorCount}
          sub={tutorCount > 0 ? 'Participación activa' : 'Sin tutores registrados'}
          icon={UserGroupIcon}
          accent="bg-blue-100 text-blue-700"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
          <p className="text-sm font-medium text-gray-600 mb-3">Última Actualización</p>
          {saved ? (
            <p className="flex items-center gap-2 text-sm text-green-600 font-semibold">
              <CheckCircleSolid className="w-4 h-4" />
              Guardado correctamente
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin cambios guardados aún</p>
          )}
        </div>
      </div>
    </div>
  );
}
