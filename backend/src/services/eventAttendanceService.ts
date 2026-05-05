import mongoose from 'mongoose';
import Event from '../models/Event';
import Enrollment from '../models/Enrollment';
import Section from '../models/Section';
import SchoolYear from '../models/SchoolYear';
import EventAttendanceRecord, { IStudentAttendanceEntry } from '../models/EventAttendanceRecord';
import ApiError from '../middleware/ApiError';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentRecord {
  id: string;
  name: string;       // "Apellido, Nombre"
  studentId: string;  // dni
  grade: string;
  section: string;
}

export interface AttendanceSummary {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  notRecordedCount: number;
  tutorCount: number;
  attendanceRate: number;
}

// ─── getStudentsForEvent ──────────────────────────────────────────────────────

/**
 * Resolves the list of students relevant to an event based on its scope.
 * Supports optional grade/section filters applied after population.
 */
export const getStudentsForEvent = async (
  eventId: string,
  filters?: { grade?: string; section?: string }
): Promise<StudentRecord[]> => {
  // 1. Fetch the event
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Evento no encontrado');
  }

  // 2. Find the active school year
  const activeYear = await SchoolYear.findOne({ status: 'Activo' });
  if (!activeYear) {
    throw ApiError.notFound('No se encontró un año escolar activo');
  }

  let enrollments: any[];

  if (event.scope === 'general') {
    // All active enrollments in the active school year
    enrollments = await Enrollment.find({
      schoolYearId: activeYear._id,
      status: 'active',
    })
      .populate('studentId', 'firstName lastName dni')
      .populate('sectionId', 'grade section');
  } else {
    // specific scope: find the matching section first
    const section = await Section.findOne({
      grade: event.targetGrade,
      section: event.targetSection,
      schoolYearId: activeYear._id,
    });

    if (!section) {
      throw ApiError.notFound(
        `No se encontró la sección ${event.targetGrade}-${event.targetSection} en el año escolar activo`
      );
    }

    enrollments = await Enrollment.find({
      sectionId: section._id,
      status: 'active',
    })
      .populate('studentId', 'firstName lastName dni')
      .populate('sectionId', 'grade section');
  }

  // 3. Map to StudentRecord, skipping any enrollment with missing populated data
  let records: StudentRecord[] = enrollments
    .filter((enrollment) => enrollment.studentId && enrollment.sectionId)
    .map((enrollment) => {
      const student = enrollment.studentId as any;
      const sec = enrollment.sectionId as any;
      return {
        id: enrollment._id.toString(),
        name: `${student.lastName}, ${student.firstName}`,
        studentId: student.dni,
        grade: String(sec.grade),
        section: sec.section,
      };
    });

  // 4. Apply optional filters
  if (filters?.grade) {
    records = records.filter((r) => r.grade === filters.grade);
  }
  if (filters?.section) {
    records = records.filter((r) => r.section === filters.section);
  }

  return records;
};

// ─── validateEntries ──────────────────────────────────────────────────────────

/**
 * Validates business rules for attendance entries.
 * Throws ApiError 400 on any violation.
 */
export const validateEntries = (
  entries: Array<{
    studentId: string;
    attendance: string | null;
    tutorPresence: string | null;
    tutorName?: string;
  }>
): void => {
  // Check for duplicate studentId values
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.studentId)) {
      throw ApiError.badRequest(
        `El estudiante con ID ${entry.studentId} aparece más de una vez en las entradas`
      );
    }
    seen.add(entry.studentId);
  }

  for (const entry of entries) {
    // apoderado requires tutorName
    if (entry.tutorPresence === 'apoderado') {
      if (!entry.tutorName || entry.tutorName.trim() === '') {
        throw ApiError.badRequest(
          'El nombre del apoderado es requerido cuando el tipo de tutor es "apoderado"'
        );
      }
    }

    // absent students must have tutorPresence === null
    if (entry.attendance === 'absent' && entry.tutorPresence !== null) {
      throw ApiError.badRequest(
        'Un estudiante ausente no puede tener presencia de tutor registrada'
      );
    }
  }
};

// ─── upsertAttendanceRecord ───────────────────────────────────────────────────

/**
 * Creates or replaces the EventAttendanceRecord for the given event.
 * Validates entries first, then uses findOneAndReplace with upsert.
 */
export const upsertAttendanceRecord = async (
  eventId: string,
  entries: IStudentAttendanceEntry[],
  userId: string
) => {
  // Validate entries (throws ApiError 400 on violation)
  validateEntries(
    entries.map((e) => ({
      studentId: e.studentId.toString(),
      attendance: e.attendance,
      tutorPresence: e.tutorPresence,
      tutorName: e.tutorName,
    }))
  );

  // Verify the event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Evento no encontrado');
  }

  const record = await EventAttendanceRecord.findOneAndReplace(
    { eventId: new mongoose.Types.ObjectId(eventId) },
    {
      eventId: new mongoose.Types.ObjectId(eventId),
      submittedBy: new mongoose.Types.ObjectId(userId),
      submittedAt: new Date(),
      entries,
    },
    { upsert: true, new: true, runValidators: true }
  );

  return record;
};

// ─── computeSummary ───────────────────────────────────────────────────────────

/**
 * Computes summary statistics from an array of attendance entries.
 */
export const computeSummary = (entries: IStudentAttendanceEntry[]): AttendanceSummary => {
  const totalStudents = entries.length;
  let presentCount = 0;
  let absentCount = 0;
  let notRecordedCount = 0;
  let tutorCount = 0;

  for (const entry of entries) {
    if (entry.attendance === 'present') {
      presentCount++;
    } else if (entry.attendance === 'absent') {
      absentCount++;
    } else {
      notRecordedCount++;
    }

    if (entry.tutorPresence !== null && entry.tutorPresence !== undefined) {
      tutorCount++;
    }
  }

  const attendanceRate =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    presentCount,
    absentCount,
    notRecordedCount,
    tutorCount,
    attendanceRate,
  };
};
