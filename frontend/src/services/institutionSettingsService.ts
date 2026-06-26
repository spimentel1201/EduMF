import { api } from './api';
import type { InstitutionSettings, InstitutionSettingsResponse } from '@/types/institution';

export const institutionSettingsService = {
  getSettings: async (): Promise<InstitutionSettings> => {
    const response = await api.get<InstitutionSettingsResponse>('/institution-settings');
    return response.data.data;
  },

  getPublicSettings: async (): Promise<Pick<InstitutionSettings, 'name' | 'logoBase64' | 'bgImageBase64' | 'bgOpacity'>> => {
    const response = await api.get<InstitutionSettingsResponse>('/institution-settings/public');
    return response.data.data;
  },

  updateSettings: async (data: InstitutionSettings): Promise<InstitutionSettings> => {
    const response = await api.put<InstitutionSettingsResponse>('/institution-settings', data);
    return response.data.data;
  },
};

