import { api } from './api';
import type { Section, SectionFormData } from '@/types/academic';

export const sectionService = {
  getAll: async (): Promise<Section[]> => {
    const response = await api.get('/sections');
    return response.data.data; // Extraer del objeto data
  },

  getById: async (id: number): Promise<Section> => {
    const response = await api.get(`/sections/${id}`);
    return response.data.data; // Extraer del objeto data
  },

  create: async (section: SectionFormData): Promise<Section> => {
    const response = await api.post('/sections', section);
    return response.data.data; // Extraer del objeto data
  },

  update: async (id: number, section: Partial<SectionFormData>): Promise<Section> => {
    const response = await api.put(`/sections/${id}`, section);
    return response.data.data; // Extraer del objeto data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sections/${id}`);
  },
};