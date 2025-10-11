export interface SchoolYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SchoolYearStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Section {
  id: string;
  name: string;
  grade: string;
  level: EducationalLevel;
  schoolYearId: string;
  status: SectionStatus;
  maxStudents: number;
  course: string;
  period: string;
  teacher: string;
  students: string[];
  schedule: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  level: EducationalLevel;
  status: CourseStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseSchedule {
  id: string;
  courseId: Course;
  sectionId: Section;
  teacherId: StaffMember;
  timeSlotId: TimeSlot;
  schoolYearId: SchoolYear;
  dayOfWeek: DayOfWeek;
  classroom: string;
  status: CourseScheduleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: TimeSlotType;
  status: TimeSlotStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseScheduleFormData {
  courseId: string;
  sectionId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  timeSlotId: string;
  schoolYearId: string;
  classroom: string;
  status: CourseScheduleStatus;
}

export interface TimeSlotFormData {
  name: string;
  startTime: string;
  endTime: string;
  type: TimeSlotType;
  status: TimeSlotStatus;
}

export type SchoolYearStatus = 'Activo' | 'Inactivo' | 'Finalizado';

export type SectionStatus = 'Activo' | 'Inactivo';

export type CourseStatus = 'Activo' | 'Inactivo';

export type CourseScheduleStatus = 'Activo' | 'Inactivo';

export type TimeSlotType = 'Clase' | 'Receso' | 'Almuerzo';

export type TimeSlotStatus = 'Activo' | 'Inactivo';

// Importar tipos necesarios de staff.ts
import { DayOfWeek, EducationalLevel, StaffMember } from './staff';

// Constantes para opciones de formularios
export const SCHOOL_YEAR_STATUSES: SchoolYearStatus[] = ['Activo', 'Inactivo', 'Finalizado'];

export const SECTION_STATUSES: SectionStatus[] = ['Activo', 'Inactivo'];

export const COURSE_STATUSES: CourseStatus[] = ['Activo', 'Inactivo'];

export const COURSE_SCHEDULE_STATUSES: CourseScheduleStatus[] = ['Activo', 'Inactivo'];

export const TIME_SLOT_TYPES: TimeSlotType[] = ['Clase', 'Receso', 'Almuerzo'];

export const TIME_SLOT_STATUSES: TimeSlotStatus[] = ['Activo', 'Inactivo'];

// Formularios
export interface SchoolYearFormData {
  name: string;
  startDate: Date;
  endDate: Date;
  status: SchoolYearStatus;
}

export interface SectionFormData {
  name: string;        // Letra de sección (A, B, C)
  grade: number;       // Número de grado (1-6)
  level: EducationalLevel;
  schoolYearId: string;
  maxStudents: number;
  course?: string;
  period?: string;
  teacher?: string;
  students?: string[];
  schedule?: string[];
  status?: SectionStatus;
}

export interface CourseFormData {
  name: string;
  description?: string;
  level: EducationalLevel;
  status: CourseStatus;
}