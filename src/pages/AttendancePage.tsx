import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { attendanceService } from '../services/attendanceService';
import { sectionService } from '../services/sectionService';
import { enrollmentService } from '../services/enrollmentService';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  dni: string;
}

export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
}

const STATUS_CONFIG: Record<AttendanceStatus, { active: string; inactive: string; label: string }> = {
  Presente:    { active: 'bg-green-600 text-white',  inactive: 'bg-green-50 text-green-700 border border-green-200',    label: 'Presente'    },
  Tardanza:    { active: 'bg-orange-500 text-white', inactive: 'bg-orange-50 text-orange-700 border border-orange-200', label: 'Tardanza'    },
  Ausente:     { active: 'bg-red-600 text-white',    inactive: 'bg-red-50 text-red-700 border border-red-200',           label: 'Ausente'     },
  Justificado: { active: 'bg-amber-500 text-white',  inactive: 'bg-amber-50 text-amber-700 border border-amber-200',    label: 'Justificado' },
};

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedSection, setSelectedSection] = useState('');
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendance[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  // Track whether the current state has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const { t } = useTranslation();

  // Ref to avoid re-running the existing-records fetch when studentsAttendance changes
  const initializedRef = useRef(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getAll(),
  });

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ['studentsBySection', selectedSection],
    queryFn: () => {
      if (!selectedSection) return Promise.resolve([]);
      return enrollmentService.getStudentsBySection(selectedSection);
    },
    enabled: !!selectedSection,
  });

  // ── When students or date/section change, load existing records ──
  useEffect(() => {
    if (!selectedSection || !selectedDate || students.length === 0) {
      setStudentsAttendance([]);
      setHasExistingRecord(false);
      setSavedAt(null);
      setIsDirty(false);
      return;
    }

    setLoadingExisting(true);
    initializedRef.current = false;

    attendanceService
      .getExistingByDateAndSection(selectedDate, selectedSection)
      .then((existingMap) => {
        const hasAny = Object.keys(existingMap).length > 0;
        setHasExistingRecord(hasAny);
        if (hasAny) setSavedAt(new Date());

        setStudentsAttendance(
          students.map((s) => ({
            studentId: s._id,
            // Use existing status if found, otherwise default to 'Presente'
            status: (existingMap[s._id] as AttendanceStatus) ?? 'Presente',
          }))
        );
        setIsDirty(false);
        initializedRef.current = true;
      })
      .catch(() => {
        // If the fetch fails, still initialize with defaults
        setStudentsAttendance(
          students.map((s) => ({ studentId: s._id, status: 'Presente' }))
        );
        setIsDirty(false);
        initializedRef.current = true;
      })
      .finally(() => setLoadingExisting(false));
  }, [students, selectedDate, selectedSection]);

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentsAttendance((prev) =>
      prev.map((sa) => (sa.studentId === studentId ? { ...sa, status } : sa))
    );
    setIsDirty(true);
    setSavedAt(null);
  };

  const handleRegisterAttendance = async () => {
    if (!selectedSection || studentsAttendance.length === 0) return;
    setSaving(true);
    try {
      await attendanceService.bulkCreateAttendances({
        date: selectedDate,
        sectionId: selectedSection,
        studentAttendances: studentsAttendance,
      });
      setSavedAt(new Date());
      setHasExistingRecord(true);
      setIsDirty(false);
      toast.success(
        hasExistingRecord
          ? 'Asistencia actualizada correctamente'
          : 'Asistencia registrada correctamente',
        { duration: 4000, icon: '✅' }
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        t('attendance.attendanceRegisteredError');
      toast.error(msg, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (studentId: string): AttendanceStatus =>
    studentsAttendance.find((sa) => sa.studentId === studentId)?.status ?? 'Presente';

  // Summary counts
  const counts = Object.fromEntries(
    (['Presente', 'Tardanza', 'Ausente', 'Justificado'] as AttendanceStatus[]).map((s) => [
      s,
      studentsAttendance.filter((sa) => sa.status === s).length,
    ])
  );

  const isLoading = isLoadingStudents || loadingExisting;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>{t('attendance.title')}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>{t('attendance.subtitle')}</p>
        </div>
        {/* Saved indicator */}
        {savedAt && !isDirty && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
            <CheckCircleSolid className="w-3.5 h-3.5" />
            Guardado {savedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {isDirty && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            Cambios sin guardar
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('attendance.date')}
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setIsDirty(false); setSavedAt(null); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('attendance.section')}
            </label>
            <div className="relative">
              <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedSection}
                onChange={(e) => { setSelectedSection(e.target.value); setIsDirty(false); setSavedAt(null); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 appearance-none"
              >
                <option value="">Seleccionar Sección</option>
                {sections.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Existing record banner */}
        {hasExistingRecord && !isDirty && (
          <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <CheckCircleSolid className="w-4 h-4 flex-shrink-0" />
            <span>Ya existe un registro de asistencia para esta fecha y sección. Puedes modificarlo y guardar de nuevo.</span>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && selectedSection && (
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
          <ArrowPathIcon className="w-5 h-5 animate-spin" />
          <span className="text-sm">
            {loadingExisting ? 'Cargando registros existentes…' : 'Cargando estudiantes…'}
          </span>
        </div>
      )}

      {/* ── No section selected ── */}
      {!selectedSection && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{t('attendance.selectSectionPrompt')}</p>
        </div>
      )}

      {/* ── No students ── */}
      {selectedSection && !isLoading && students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">{t('attendance.noStudentsInSection')}</p>
        </div>
      )}

      {/* ── Summary + Table ── */}
      {selectedSection && !isLoading && students.length > 0 && (
        <>
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            {(['Presente', 'Tardanza', 'Ausente', 'Justificado'] as AttendanceStatus[]).map((s) => (
              <div
                key={s}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${STATUS_CONFIG[s].inactive}`}
              >
                <span>{STATUS_CONFIG[s].label}</span>
                <span className="font-bold">{counts[s]}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#f8faf9' }}>
                    <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                      Estudiante
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                      DNI
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => {
                    const current = getStatus(student._id);
                    return (
                      <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: '#538f65' }}
                            >
                              {initials(student.firstName, student.lastName)}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{student.dni}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(['Presente', 'Tardanza', 'Ausente', 'Justificado'] as AttendanceStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleAttendanceChange(student._id, s)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  current === s
                                    ? STATUS_CONFIG[s].active
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {students.length} estudiante{students.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleRegisterAttendance}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
                style={{ background: '#538f65' }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#47795a'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#538f65'; }}
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    {hasExistingRecord ? 'Actualizar Asistencia' : 'Registrar Asistencia'}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
