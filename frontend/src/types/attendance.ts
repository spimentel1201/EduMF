export interface AttendanceRecordDisplay {
  id: string;
  studentId?: string;
  studentName: string;
  sectionName: string;
  date: string;
  status: 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';
  notes?: string;
  horaEntrada?: string | null;
  horaSalida?: string | null;
}

export interface AttendanceFilterParams {
  startDate?: string;
  endDate?: string;
  sectionId?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}