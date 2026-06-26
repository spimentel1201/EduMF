export interface StaffMember {
  id: string; // Cambiado de number a string
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  level: EducationalLevel;
  status: StaffStatus;
  phone: string;
  address: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Schedule {
  id: number;
  staffId: number;
  staffName: string;
  role: StaffRole;
  level: EducationalLevel;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  status: ScheduleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type StaffRole = 
  | 'Docente'
  | 'Psicólogo(a)'
  | 'Mantenimiento'
  | 'CIST'
  | 'Dirección'
  | 'Auxiliar';

export type EducationalLevel = 
  | 'Inicial'
  | 'Primaria'
  | 'Secundaria'
  | 'General';

export type StaffStatus = 'Activo' | 'Inactivo';

export type ScheduleStatus = 'Activo' | 'Inactivo';

export type DayOfWeek = 
  | 'Lunes'
  | 'Martes'
  | 'Miércoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sábado'
  | 'Domingo';

export interface StaffFormData {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  level: EducationalLevel;
  status: StaffStatus;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
}

export interface ScheduleFormData {
  staffId: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  status: ScheduleStatus;
}

// Constantes para opciones de formularios
export const STAFF_ROLES: StaffRole[] = [
  'Docente',
  'Psicólogo(a)',
  'Mantenimiento',
  'CIST',
  'Dirección',
  'Auxiliar'
];

export const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  'Inicial',
  'Primaria',
  'Secundaria',
  'General'
];

export const STAFF_STATUSES: StaffStatus[] = ['Activo', 'Inactivo'];

export const SCHEDULE_STATUSES: ScheduleStatus[] = ['Activo', 'Inactivo'];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

export const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
];

export const getRoleDescription = (role: StaffRole): string => {
  const descriptions: Record<StaffRole, string> = {
    'Docente': 'Personal que imparte clases en el nivel educativo',
    'Psicólogo(a)': 'Profesional de psicología educativa y orientación',
    'Mantenimiento': 'Personal de servicios generales y mantenimiento',
    'CIST': 'Personal de tecnologías de la información',
    'Dirección': 'Personal directivo y administrativo',
    'Auxiliar': 'Personal de apoyo y asistencia'
  };
  return descriptions[role];
};

export const getLevelDescription = (level: EducationalLevel): string => {
  const descriptions: Record<EducationalLevel, string> = {
    'Inicial': 'Educación inicial (3-5 años)',
    'Primaria': 'Educación primaria (6-11 años)',
    'Secundaria': 'Educación secundaria (12-16 años)',
    'General': 'Aplica a todos los niveles educativos'
  };
  return descriptions[level];
};

export const getRoleColor = (role: StaffRole): string => {
  const colors: Record<StaffRole, string> = {
    'Docente': 'bg-blue-100 text-blue-800',
    'Psicólogo(a)': 'bg-purple-100 text-purple-800',
    'Mantenimiento': 'bg-orange-100 text-orange-800',
    'CIST': 'bg-indigo-100 text-indigo-800',
    'Dirección': 'bg-red-100 text-red-800',
    'Auxiliar': 'bg-gray-100 text-gray-800'
  };
  return colors[role];
};

export const getDayColor = (day: DayOfWeek): string => {
  const colors: Record<DayOfWeek, string> = {
    'Lunes': 'bg-blue-100 text-blue-800',
    'Martes': 'bg-green-100 text-green-800',
    'Miércoles': 'bg-yellow-100 text-yellow-800',
    'Jueves': 'bg-purple-100 text-purple-800',
    'Viernes': 'bg-red-100 text-red-800',
    'Sábado': 'bg-indigo-100 text-indigo-800',
    'Domingo': 'bg-gray-100 text-gray-800'
  };
  return colors[day];
};

export const getStatusColor = (status: StaffStatus | ScheduleStatus): string => {
  return status === 'Activo' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

export const calculateWorkHours = (start: string, end: string): number => {
  const startTime = new Date(`2000-01-01T${start}:00`);
  const endTime = new Date(`2000-01-01T${end}:00`);
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours);
};
