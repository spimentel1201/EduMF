import { api } from './api';
import type { TimeSlot, TimeSlotFormData } from '@/types/academic';

export const timeSlotService = {
  getAll: async (): Promise<TimeSlot[]> => {
    const response = await api.get('/time-slots');
    return response.data.data;
  },

  getById: async (id: string): Promise<TimeSlot> => {
    const response = await api.get(`/time-slots/${id}`);
    return response.data.data;
  },

  create: async (timeSlot: TimeSlotFormData): Promise<TimeSlot> => {
    const response = await api.post('/time-slots', timeSlot);
    return response.data.data;
  },

  update: async (id: string, timeSlot: Partial<TimeSlotFormData>): Promise<TimeSlot> => {
    const response = await api.put(`/time-slots/${id}`, timeSlot);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/time-slots/${id}`);
  },
};