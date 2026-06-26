import { api } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventCategory = 'Académico' | 'Artes' | 'Deportes' | 'Cultura' | 'Otro';
export type EventScope = 'general' | 'specific';
export type AttendanceStatus = 'present' | 'absent' | null;
export type TutorPresence = 'padre' | 'madre' | 'apoderado' | null;

/** Matches the Event interface in EventsPage.tsx */
export interface EventDTO {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;         // ISO date string
  timeStart: string;
  timeEnd: string;
  location: string;
  imageUrl?: string;
  attendeesCount: number;
  featured: boolean;
  scope: EventScope;
  targetGrade?: string;
  targetSection?: string;
  capacity?: number;
}

/** Matches the StudentRecord interface in EventAttendancePage.tsx */
export interface StudentRecordDTO {
  id: string;
  name: string;         // "Apellido, Nombre"
  studentId: string;    // dni
  grade: string;
  section: string;
  attendance: AttendanceStatus;
  tutorPresence: TutorPresence;
  tutorName: string;
}

export interface AttendanceSummaryDTO {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  notRecordedCount: number;
  tutorCount: number;
  attendanceRate: number; // 0–100, rounded integer
}

export interface PaginatedEventsResponse {
  success: boolean;
  data: EventDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetEventsParams {
  search?: string;
  category?: EventCategory | 'all';
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface GetStudentsParams {
  grade?: string;
  section?: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  category: EventCategory;
  date: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  imageUrl?: string;
  featured?: boolean;
  scope?: EventScope;
  targetGrade?: string;
  targetSection?: string;
  capacity?: number;
}

export interface SaveAttendanceEntry {
  studentId: string;
  attendance: AttendanceStatus;
  tutorPresence: TutorPresence;
  tutorName?: string;
  grade?: string;
  section?: string;
}

// ─── Event CRUD ───────────────────────────────────────────────────────────────

export const eventService = {
  /**
   * Get paginated list of events with optional filters.
   */
  getEvents: async (params?: GetEventsParams): Promise<PaginatedEventsResponse> => {
    const query: Record<string, string | number | boolean> = {};
    if (params?.search) query.search = params.search;
    if (params?.category && params.category !== 'all') query.category = params.category;
    if (params?.featured !== undefined) query.featured = params.featured;
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;

    const response = await api.get('/events', { params: query });
    return response.data;
  },

  /**
   * Get a single event by ID.
   */
  getEventById: async (id: string): Promise<EventDTO> => {
    const response = await api.get(`/events/${id}`);
    return response.data.data;
  },

  /**
   * Create a new event.
   */
  createEvent: async (data: CreateEventPayload): Promise<EventDTO> => {
    const response = await api.post('/events', data);
    return response.data.data;
  },

  /**
   * Update an existing event.
   */
  updateEvent: async (id: string, data: Partial<CreateEventPayload>): Promise<EventDTO> => {
    const response = await api.put(`/events/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete an event.
   */
  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────

  /**
   * Get the list of students for an event's attendance page.
   * Returns students pre-populated with null attendance/tutor fields.
   */
  getStudentsForEvent: async (
    eventId: string,
    filters?: GetStudentsParams
  ): Promise<StudentRecordDTO[]> => {
    const response = await api.get(`/events/${eventId}/attendance/students`, {
      params: filters,
    });
    // Backend returns { id, name, studentId, grade, section } — add default attendance fields
    return (response.data.data as Array<{
      id: string;
      name: string;
      studentId: string;
      grade: string;
      section: string;
    }>).map((s) => ({
      ...s,
      attendance: null,
      tutorPresence: null,
      tutorName: '',
    }));
  },

  /**
   * Get the saved attendance record for an event (with populated student data and summary).
   */
  getEventAttendance: async (
    eventId: string
  ): Promise<{ record: any; summary: AttendanceSummaryDTO }> => {
    const response = await api.get(`/events/${eventId}/attendance`);
    return response.data.data;
  },

  /**
   * Save (create or replace) attendance for an event — use on first save.
   */
  saveEventAttendance: async (
    eventId: string,
    entries: SaveAttendanceEntry[]
  ): Promise<any> => {
    const response = await api.post(`/events/${eventId}/attendance`, { entries });
    return response.data.data;
  },

  /**
   * Update existing attendance for an event — use on subsequent saves.
   */
  updateEventAttendance: async (
    eventId: string,
    entries: SaveAttendanceEntry[]
  ): Promise<any> => {
    const response = await api.put(`/events/${eventId}/attendance`, { entries });
    return response.data.data;
  },

  /**
   * Get summary statistics for an event's attendance.
   * Returns zero-counts if no attendance record exists yet.
   */
  getEventAttendanceSummary: async (eventId: string): Promise<AttendanceSummaryDTO> => {
    const response = await api.get(`/events/${eventId}/attendance/summary`);
    return response.data.data;
  },
};
