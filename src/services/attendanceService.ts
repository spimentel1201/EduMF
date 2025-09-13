import { api } from './api';

export interface AttendanceRecord {
  studentId: string;
  courseScheduleId: string;
  date: string;
  status: 'presente' | 'ausente' | 'justificado' | 'tarde';
  notes?: string;
}

export const attendanceService = {
  getByDate: async (date: string, courseScheduleId?: string) => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (courseScheduleId) params.append('courseScheduleId', courseScheduleId);
    
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
};