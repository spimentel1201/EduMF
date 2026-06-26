import { api } from './api';
import type { SchoolYear, SchoolYearFormData } from '@/types/academic';

export const schoolYearService = {
  getAll: async (): Promise<SchoolYear[]> => {
    const response = await api.get('/school-years');
    return response.data.data.map((item: any) => {
      return {
        id: item.id,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  },

  getById: async (id: string): Promise<SchoolYear> => {
    const response = await api.get(`/school-years/${id}`);
    const item = response.data.data;
    return {
      id: item.id,
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  create: async (schoolYear: SchoolYearFormData): Promise<SchoolYear> => {
    const response = await api.post('/school-years', schoolYear);
    const item = response.data.data;
    return {
      id: item.id, 
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  update: async (id: string, schoolYear: Partial<SchoolYearFormData>): Promise<SchoolYear> => {
    const response = await api.put(`/school-years/${id}`, schoolYear);
    const item = response.data.data;
    return {
      id: item.id, 
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/school-years/${id}`);
  },
};