// Actualizar las interfaces para usar strings en lugar de números
export interface SchoolYear {
  id: string;
  name: string;
  startDate: string; // Backend devuelve string ISO
  endDate: string;   // Backend devuelve string ISO
  status: SchoolYearStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Section {
  id: string; // Cambiar de number a string
  name: string;
  grade: string;
  level: EducationalLevel;
  schoolYearId: string; // Cambiar de number a string
  status: SectionStatus;
  maxStudents: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string; // Cambiar de number a string
  name: string;
  description?: string;
  level: EducationalLevel;
  status: CourseStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseSchedule {
  id: string; // Cambiar de number a string
  courseId: Course; // Esto será el objeto Course poblado
  sectionId: Section; // Esto será el objeto Section poblado
  teacherId: StaffMember; // Esto será el objeto StaffMember poblado
  timeSlotId: TimeSlot; // Esto será el objeto TimeSlot poblado
  schoolYearId: SchoolYear; // Esto será el objeto SchoolYear poblado
  dayOfWeek: DayOfWeek;
  classroom: string;
  status: CourseScheduleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeSlot {
  id: string; // Cambiar de number a string
  name: string;
  startTime: string;
  endTime: string;
  type: TimeSlotType;
  status: TimeSlotStatus;
  createdAt?: string;
  updatedAt?: string;
}

// Actualizar interfaces de formulario
export interface CourseScheduleFormData {
  courseId: string; // Cambiar de number a string
  sectionId: string; // Cambiar de number a string
  teacherId: string; // Cambiar de number a string
  dayOfWeek: DayOfWeek;
  timeSlotId: string; // Cambiar de number a string
  schoolYearId: string; // Cambiar de number a string
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
  status?: SectionStatus;
}

export interface CourseFormData {
  name: string;
  description?: string;
  level: EducationalLevel;
  status: CourseStatus;
}