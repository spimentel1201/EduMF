import { api } from './api';
import type {
  DniEscolar,
  DniEscolarListParams,
  DniEscolarListResponse,
  DniEscolarStats,
  GenerarDesdeMatriculaPayload,
  GenerarDesdeMatriculaResult,
  StudentBySection,
  SubirFotosPayload,
  SubirFotosResult,
} from '@/types/dniEscolar';

export const dniEscolarService = {
  getAll: async (params: DniEscolarListParams = {}): Promise<DniEscolarListResponse> => {
    const response = await api.get('/dni-escolar', { params });
    return response.data;
  },

  getById: async (id: string): Promise<DniEscolar> => {
    const response = await api.get(`/dni-escolar/${id}`);
    return response.data.data;
  },

  create: async (dni: Partial<DniEscolar>): Promise<DniEscolar> => {
    const response = await api.post('/dni-escolar', dni);
    return response.data.data;
  },

  update: async (id: string, dni: Partial<DniEscolar>): Promise<DniEscolar> => {
    const response = await api.put(`/dni-escolar/${id}`, dni);
    return response.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/dni-escolar/${id}`);
  },

  getStats: async (): Promise<DniEscolarStats> => {
    const response = await api.get('/dni-escolar/stats');
    return response.data.data;
  },

  /** Estudiantes matriculados en una sección (endpoint existente de matrícula). */
  getStudentsBySection: async (sectionId: string): Promise<StudentBySection[]> => {
    const response = await api.get(`/enrollments/section/${sectionId}`);
    return response.data;
  },

  generarDesdeMatricula: async (
    payload: GenerarDesdeMatriculaPayload
  ): Promise<GenerarDesdeMatriculaResult> => {
    const response = await api.post('/dni-escolar/generar', payload);
    return response.data.data;
  },

  subirFotos: async (payload: SubirFotosPayload): Promise<SubirFotosResult> => {
    const response = await api.post('/dni-escolar/fotos', payload);
    return response.data.data;
  },

  getPrintData: async (ids: string[]): Promise<DniEscolar[]> => {
    const response = await api.get('/dni-escolar/print', {
      params: { ids: ids.join(',') },
    });
    return response.data.data;
  },
};
