import { api } from './api';
import type { CourseSchedule, CourseScheduleFormData } from '@/types/academic';

export const courseScheduleService = {
  getAll: async (): Promise<CourseSchedule[]> => {
    const response = await api.get('/course-schedules');
    return response.data.data;
  },

  getById: async (id: string): Promise<CourseSchedule> => {
    const response = await api.get(`/course-schedules/${id}`);
    return response.data.data;
  },

  create: async (schedule: CourseScheduleFormData): Promise<CourseSchedule> => {
    const response = await api.post('/course-schedules', schedule);
    return response.data.data;
  },

  update: async (id: string, schedule: Partial<CourseScheduleFormData>): Promise<CourseSchedule> => {
    const response = await api.put(`/course-schedules/${id}`, schedule);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/course-schedules/${id}`);
  },
};