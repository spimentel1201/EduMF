import { api } from './api';
import type { StaffMember } from '@/types/staff';

export const staffService = {
  getAll: async (): Promise<StaffMember[]> => {
    const response = await api.get('/staff');
    return response.data.data;
  },

  getById: async (id: string): Promise<StaffMember> => {
    const response = await api.get(`/staff/${id}`);
    return response.data.data;
  },

  create: async (staff: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
    const response = await api.post('/staff', staff);
    return response.data.data;
  },

  update: async (id: string, staff: Partial<StaffMember>): Promise<StaffMember> => {
    const response = await api.put(`/staff/${id}`, staff);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/staff/${id}`);
  },
};