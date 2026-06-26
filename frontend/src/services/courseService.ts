import { api } from './api';
import type { Course, CourseFormData } from '@/types/academic';

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return response.data.data;
  },

  getById: async (id: number): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data.data;
  },

  create: async (course: CourseFormData): Promise<Course> => {
    const response = await api.post('/courses', course);
    return response.data.data;
  },

  update: async (id: number, course: Partial<CourseFormData>): Promise<Course> => {
    const response = await api.put(`/courses/${id}`, course);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};