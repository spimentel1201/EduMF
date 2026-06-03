import { api } from './api';
import type { Section, SectionFormData } from '@/types/academic';

export const getSections = async (): Promise<Section[]> => {
  const response = await api.get('/sections?limit=1000');
  return response.data.data;
};

export const sectionService = {
  getAll: getSections,
  
  getPaginated: async (params?: { page?: number; limit?: number; search?: string; level?: string }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.level) queryParams.append('level', params.level);
    
    const response = await api.get(`/sections?${queryParams.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Section> => {
    const response = await api.get(`/sections/${id}`);
    return response.data.data;
  },

  create: async (section: SectionFormData): Promise<Section> => {
    const response = await api.post('/sections', section);
    return response.data.data;
  },

  update: async (id: number, section: Partial<SectionFormData>): Promise<Section> => {
    const response = await api.put(`/sections/${id}`, section);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sections/${id}`);
  },
};