import { api } from './api';

export const dashboardService = {
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  },
};
