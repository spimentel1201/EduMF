export interface AttendanceRecordDisplay {
  id: string;
  studentName: string;
  sectionName: string;
  date: string;
  status: 'Presente' | 'Tardanza' | 'Ausente' | 'Justificado';
}

export interface AttendanceFilterParams {
  startDate?: string;
  endDate?: string;
  sectionId?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}