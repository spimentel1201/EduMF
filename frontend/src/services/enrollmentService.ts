import { api } from './api';
import type {
  BulkEnrollmentResponse,
  SiagiePreviewData,
  SiagieCommitData,
  ResetPreviewData,
  ResetPreview,
} from '@/types/enrollment';

export interface EnrollmentFormData {
  studentId: string;
  sectionId: string;
  schoolYearId: string;
}

export interface BulkEnrollmentPayload {
  schoolYearName: string;
  sectionName: string;
  students: Array<{
    firstName: string;
    lastName: string;
    dni: string;
    gender: string;
    birthDate: string;
  }>;
}

export interface SiagieOpciones {
  crearSeccionesFaltantes: boolean;
  incluirTrasladados: boolean;
}

export interface ResetResult {
  resumen: ResetPreview;
  /** Backup JSON de todo lo eliminado (solo si se solicitó). */
  backup: any | null;
}

export const enrollmentService = {
  createEnrollment: async (enrollmentData: EnrollmentFormData) => {
    try {
      const response = await api.post('/enrollments', enrollmentData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  bulkEnrollStudents: async (payload: FormData): Promise<BulkEnrollmentResponse> => {
    try {
      const response = await api.post('/enrollments/bulk', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  getStudentsBySection: async (sectionId: string) => {
    try {
      const response = await api.get(`/enrollments/section/${sectionId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  // ── Importación SIAGIE ────────────────────────────────────────────────────
  previewSiagie: async (
    file: File,
    schoolYearId: string,
    opciones: SiagieOpciones
  ): Promise<SiagiePreviewData> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('schoolYearId', schoolYearId);
    formData.append('crearSeccionesFaltantes', String(opciones.crearSeccionesFaltantes));
    formData.append('incluirTrasladados', String(opciones.incluirTrasladados));

    try {
      const response = await api.post('/enrollments/import/siagie/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  commitSiagie: async (
    file: File,
    schoolYearId: string,
    opciones: SiagieOpciones
  ): Promise<SiagieCommitData> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('schoolYearId', schoolYearId);
    formData.append('crearSeccionesFaltantes', String(opciones.crearSeccionesFaltantes));
    formData.append('incluirTrasladados', String(opciones.incluirTrasladados));

    try {
      const response = await api.post('/enrollments/import/siagie/commit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  // ── Reinicio de estudiantes ───────────────────────────────────────────────
  previewReset: async (): Promise<ResetPreviewData> => {
    try {
      const response = await api.get('/enrollments/import/reset/preview');
      return response.data.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },

  resetStudents: async (confirmacion: string): Promise<ResetResult> => {
    try {
      const response = await api.post('/enrollments/import/reset', { confirmacion });
      return response.data.data;
    } catch (error: any) {
      throw error.response?.data ?? error;
    }
  },
};
