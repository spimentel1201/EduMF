import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, XMarkIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const navigate = useNavigate();

  // ── View mode: 'edit' allows toggling attendance, 'view' is read-only ──
  const [mode, setMode] = useState<'edit' | 'view'>('edit');

  // ── Confirmation modal state ──
  const [showConfirm, setShowConfirm] = useState(false);

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

  // ── Tracks whether the saved-record check has completed (success or 404) ──
  // The fresh student list must NOT load until we know there is no saved record.
  const [savedRecordChecked, setSavedRecordChecked] = useState(false);

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
          // Check if all entries have null studentId (corrupted record with enrollment IDs)
          const allNull = record.entries.every((e: any) => e.studentId === null);

          if (allNull) {
            // Corrupted record: studentIds were saved as enrollment IDs, not user IDs.
            // Store the attendance states so we can merge them after fresh load.
            const attendanceByIndex = record.entries.map((e: any) => ({
              attendance:    e.attendance ?? null,
              tutorPresence: e.tutorPresence ?? null,
              tutorName:     e.tutorName ?? '',
              grade:         e.grade ?? '',
              section:       e.section ?? '',
            }));
            setHasSavedRecord(true);
            (window as any).__corruptedAttendance = attendanceByIndex;
            // Allow the fresh student list to load (to merge attendance by position)
            setSavedRecordChecked(true);
            return;
          }

          const mapped: StudentRecord[] = record.entries.map((entry: any) => {
            const student = entry.studentId && typeof entry.studentId === 'object'
              ? entry.studentId
              : null;

            return {
              id:            student?._id ?? '',
              name:          student?.lastName
                               ? `${student.lastName}, ${student.firstName}`
                               : '',
              studentId:     student?.dni ?? '',
              grade:         entry.grade ?? '',
              section:       entry.section ?? '',
              attendance:    entry.attendance ?? null,
              tutorPresence: entry.tutorPresence ?? null,
              tutorName:     entry.tutorName ?? '',
            };
          });
          setRecords(mapped);
          setHasSavedRecord(true);
          setStudentsLoading(false);
          // Mark as checked — the second useEffect will see hasSavedRecord=true and skip
          setSavedRecordChecked(true);
        } else {
          // Record exists but has no entries — treat as no saved record
          setSavedRecordChecked(true);
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status !== 404) {
          console.error('Failed to load existing attendance:', err);
        }
        // 404 or error → no saved record, allow fresh student list to load
        setSavedRecordChecked(true);
      });
  }, [eventId]);

  // ── Fetch students when filters change (skip if saved record already loaded) ──
  useEffect(() => {
    if (!eventId) return;
    // Wait until the saved-record check completes before deciding whether to load fresh
    if (!savedRecordChecked) return;
    // If we have a clean saved record (not corrupted), skip the fresh load entirely
    if (hasSavedRecord && !(window as any).__corruptedAttendance) return;

    setStudentsLoading(true);
    eventService
      .getStudentsForEvent(eventId, {
        grade:   gradeFilter   !== 'all' ? gradeFilter   : undefined,
        section: sectionFilter !== 'all' ? sectionFilter : undefined,
      })
      .then((students) => {
        const corrupted: any[] | undefined = (window as any).__corruptedAttendance;
        const mapped = students.map((s, idx) => ({
          id:            s.id,
          name:          s.name,
          studentId:     s.studentId,
          grade:         s.grade,
          section:       s.section,
          // Merge corrupted attendance by position if available
          attendance:    corrupted?.[idx]?.attendance    ?? s.attendance,
          tutorPresence: corrupted?.[idx]?.tutorPresence ?? s.tutorPresence,
          tutorName:     corrupted?.[idx]?.tutorName     ?? s.tutorName,
        }));
        setRecords(mapped);
        // Clear the corrupted data after merging
        if (corrupted) {
          delete (window as any).__corruptedAttendance;
        }
      })
      .catch((err) => console.error('Failed to load students:', err))
      .finally(() => setStudentsLoading(false));
  }, [eventId, gradeFilter, sectionFilter, hasSavedRecord, savedRecordChecked]);

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
      grade:         r.grade,
      section:       r.section,
    }));

    try {
      if (hasSavedRecord) {
        await eventService.updateEventAttendance(eventId, entries);
      } else {
        await eventService.saveEventAttendance(eventId, entries);
        setHasSavedRecord(true);
      }
      setSaved(true);
      setShowConfirm(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        'Error al guardar la asistencia';
      setSaveError(msg);
      toast.error(msg);
    }
  };

  // ── PDF generation ──
  const handleExportPDF = () => {
    if (!event) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // ── Header: system name ──
    doc.setFillColor(83, 143, 101); // #538f65
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Gestión Escolar', pageW / 2, 14, { align: 'center' });
    y = 30;

    // ── Title ──
    doc.setTextColor(26, 32, 44);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Registro de Asistencia — Evento', pageW / 2, y, { align: 'center' });
    y += 8;

    // ── Event details box ──
    doc.setFillColor(248, 250, 249);
    doc.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 143, 101);
    doc.text('DETALLES DEL EVENTO', margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const col1x = margin + 4;
    const col2x = pageW / 2 + 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre:', col1x, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(event.title, col1x + 22, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', col1x, y + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(event.date, col1x + 22, y + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Horario:', col2x, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${event.timeStart} – ${event.timeEnd}`, col2x + 22, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.text('Lugar:', col2x, y + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(event.location, col2x + 22, y + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Categoría:', col1x, y + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(event.category, col1x + 22, y + 26);

    y += 38;

    // ── Attendance table ──
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 143, 101);
    doc.text('LISTA DE ASISTENCIA', margin, y);
    y += 4;

    const tutorLabel = (tp: TutorPresence) => {
      if (tp === 'padre') return 'Padre';
      if (tp === 'madre') return 'Madre';
      if (tp === 'apoderado') return 'Apoderado';
      return '—';
    };

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Nombre del Estudiante', 'ID', 'Grado', 'Secc.', 'Asistencia', 'Tutor', 'Nombre del Tutor']],
      body: records.map((r, i) => [
        String(i + 1),
        r.name,
        r.studentId,
        r.grade,
        r.section,
        r.attendance === 'present' ? 'Asistió' : r.attendance === 'absent' ? 'Faltó' : 'Sin registro',
        tutorLabel(r.tutorPresence),
        r.tutorName || '—',
      ]),
      headStyles: {
        fillColor: [83, 143, 101],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
      alternateRowStyles: { fillColor: [248, 250, 249] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 12 },
        5: { cellWidth: 20 },
        6: { cellWidth: 18 },
        7: { cellWidth: 'auto' },
      },
    });

    // ── Summary ──
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const absent  = records.filter((r) => r.attendance === 'absent').length;
    const noReg   = records.filter((r) => r.attendance === null).length;

    doc.setFillColor(248, 250, 249);
    doc.roundedRect(margin, finalY, pageW - margin * 2, 24, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 143, 101);
    doc.text('RESUMEN', margin + 4, finalY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const summaryItems = [
      `Total: ${records.length}`,
      `Asistieron: ${present}`,
      `Faltaron: ${absent}`,
      `Sin registro: ${noReg}`,
      `Tutores presentes: ${tutorCount}`,
      `Tasa de asistencia: ${pct}%`,
    ];
    const colW = (pageW - margin * 2 - 8) / 3;
    summaryItems.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      doc.text(item, margin + 4 + col * colW, finalY + 14 + row * 7);
    });

    // ── Signature area ──
    const sigY = finalY + 34;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);

    const sigBoxW = (pageW - margin * 2 - 10) / 2;

    // Left signature
    doc.line(margin, sigY + 18, margin + sigBoxW, sigY + 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 143, 101);
    doc.text('Firma del Responsable', margin + sigBoxW / 2, sigY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Nombre y cargo', margin + sigBoxW / 2, sigY + 28, { align: 'center' });

    // Right signature
    const sig2x = margin + sigBoxW + 10;
    doc.line(sig2x, sigY + 18, sig2x + sigBoxW, sigY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 143, 101);
    doc.text('Firma del Director(a)', sig2x + sigBoxW / 2, sigY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Nombre y cargo', sig2x + sigBoxW / 2, sigY + 28, { align: 'center' });

    // ── Footer ──
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })} — Página ${i} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    const safeName = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`asistencia_${safeName}_${event.date}.pdf`);
    toast.success('PDF generado correctamente');
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

  const isViewOnly = mode === 'view';

  return (
    <div className="space-y-5 pb-8">

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e6f4ec' }}>
              <CheckCircleSolid className="w-8 h-8" style={{ color: '#538f65' }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">¡Asistencia guardada!</h2>
            <p className="text-sm text-gray-500 mb-6">
              El registro de asistencia fue guardado correctamente.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/events')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: '#538f65' }}
              >
                Volver a Eventos
              </button>
              <button
                onClick={() => { setShowConfirm(false); setMode('view'); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Ver Asistencia
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleExportPDF(); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight" style={{ color: '#1a202c' }}>
                Registro de Asistencia
              </h1>
              {isViewOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  Solo lectura
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
              {event?.title} • {event?.date ? new Date(event.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''}
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Toggle view/edit mode */}
              {hasSavedRecord && (
                <button
                  onClick={() => setMode(isViewOnly ? 'edit' : 'view')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
                >
                  {isViewOnly
                    ? <><PencilSquareIcon className="w-4 h-4" /> Editar</>
                    : <><EyeIcon className="w-4 h-4" /> Solo Ver</>
                  }
                </button>
              )}

              {/* Save — hidden in view-only mode */}
              {!isViewOnly && (
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
              )}

              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Exportar PDF
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
                    {isViewOnly ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                        r.attendance === 'present'
                          ? 'bg-green-100 text-green-700'
                          : r.attendance === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {r.attendance === 'present' ? 'Asistió' : r.attendance === 'absent' ? 'Faltó' : 'Sin registro'}
                      </span>
                    ) : (
                      <AttendanceToggle
                        value={r.attendance}
                        onChange={(v) => updateRecord(r.id, { attendance: v })}
                      />
                    )}
                  </td>

                  {/* Tutor presence */}
                  <td className="px-5 py-3">
                    {isViewOnly ? (
                      <span className="text-sm text-gray-600">
                        {r.tutorPresence === 'padre' ? 'Padre'
                          : r.tutorPresence === 'madre' ? 'Madre'
                          : r.tutorPresence === 'apoderado' ? 'Apoderado'
                          : <span className="text-gray-300">—</span>}
                      </span>
                    ) : (
                      <TutorToggle
                        value={r.tutorPresence}
                        disabled={r.attendance === 'absent' || r.attendance === null}
                        onChange={(v) => updateRecord(r.id, { tutorPresence: v })}
                      />
                    )}
                  </td>

                  {/* Tutor name */}
                  <td className="px-5 py-3 min-w-[200px]">
                    {isViewOnly ? (
                      <span className="text-sm text-gray-600">
                        {r.tutorName || <span className="italic text-gray-300">No aplica</span>}
                      </span>
                    ) : (
                      <TutorNameField
                        value={r.tutorName}
                        tutorPresence={r.tutorPresence}
                        attendance={r.attendance}
                        onChange={(v) => updateRecord(r.id, { tutorName: v })}
                      />
                    )}
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
