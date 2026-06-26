import { api } from './api';
import type { Incident, IncidentFormData, IncidentFilters, IncidentStats } from '@/types/incidents';

interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    count: number;
    total: number;
    pagination: {
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const incidentService = {
    getAll: async (filters?: IncidentFilters, page = 1, limit = 10): Promise<PaginatedResponse<Incident>> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (filters?.incidentType) params.append('incidentType', filters.incidentType);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.isViolent !== undefined) params.append('isViolent', filters.isViolent.toString());
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.search) params.append('search', filters.search);

        const response = await api.get(`/incidents?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string): Promise<Incident> => {
        const response = await api.get(`/incidents/${id}`);
        return response.data.data;
    },

    create: async (incident: IncidentFormData): Promise<Incident> => {
        const response = await api.post('/incidents', incident);
        return response.data.data;
    },

    update: async (id: string, incident: Partial<IncidentFormData>): Promise<Incident> => {
        const response = await api.put(`/incidents/${id}`, incident);
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/incidents/${id}`);
    },

    getStats: async (): Promise<IncidentStats> => {
        const response = await api.get('/incidents/stats');
        return response.data.data;
    },

    updateStatus: async (id: string, status: string): Promise<Incident> => {
        const response = await api.patch(`/incidents/${id}/status`, { status });
        return response.data.data;
    },

    getByUser: async (userId: string): Promise<(Incident & { userRole: string })[]> => {
        const response = await api.get(`/incidents/user/${userId}`);
        return response.data.data;
    },
};
