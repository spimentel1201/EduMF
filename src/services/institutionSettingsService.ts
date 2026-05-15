import { api } from './api';
import type { InstitutionSettings, InstitutionSettingsResponse } from '@/types/institution';

export const institutionSettingsService = {
  getSettings: async (): Promise<InstitutionSettings> => {
    const response = await api.get<InstitutionSettingsResponse>('/institution-settings');
    return response.data.data;
  },

  updateSettings: async (data: InstitutionSettings): Promise<InstitutionSettings> => {
    const response = await api.put<InstitutionSettingsResponse>('/institution-settings', data);
    return response.data.data;
  },
};
