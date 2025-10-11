import { api } from './api';
import { AttendanceRecordDisplay, AttendanceFilterParams } from '../types/attendance';

export interface AttendanceRecord {
  studentId: string;
  courseScheduleId: string;
  date: string;
  status: 'presente' | 'ausente' | 'justificado' | 'tarde';
  notes?: string;
}

export const attendanceService = {
  getByDate: async (date: string, sectionId?: string) => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (sectionId) params.append('sectionId', sectionId);
    
    const response = await api.get(`/attendance?${params.toString()}`);
    return response.data.data;
  },

  create: async (attendance: AttendanceRecord[]) => {
    const response = await api.post('/attendance', attendance);
    return response.data.data;
  },

  update: async (id: string, attendance: Partial<AttendanceRecord>) => {
    const response = await api.put(`/attendance/${id}`, attendance);
    return response.data.data;
  },

  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/attendance/stats?${params.toString()}`);
    return response.data.data;
  },

  bulkCreateAttendances: async (data: { date: string; sectionId: string; studentAttendances: Array<{ studentId: string; status: string }> }) => {
    try {
      const response = await api.post('/attendance/bulk', data);
      return response.data;
    } catch (error: any) {
      throw error.response.data;
    }
  },

  getMonthlyAttendanceReport: async (params: { sectionId?: string; month: number; year: number }) => {
    const queryParams = new URLSearchParams();
    if (params.sectionId) queryParams.append('sectionId', params.sectionId);
    queryParams.append('month', params.month.toString());
    queryParams.append('year', params.year.toString());
    const response = await api.get(`/attendances/report/monthly?${queryParams.toString()}`);
    return response.data.data;
  },

  getAttendanceRecords: async (filters: AttendanceFilterParams): Promise<{ attendanceRecords: AttendanceRecordDisplay[], totalRecords: number }> => {
    const response = await api.get('/attendance-records', { params: filters });
    return {
      attendanceRecords: response.data.data,
      totalRecords: response.data.total,
    };
  },
};