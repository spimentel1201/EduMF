import { api } from './api';

export interface EnrollmentFormData {
  studentId: string;
  sectionId: string;
  schoolYearId: string;
}

export interface BulkEnrollmentResponse {
  msg: string;
  totalProcessed: number;
  successCount: number;
  errors: any[];
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

export const enrollmentService = {
  createEnrollment: async (enrollmentData: EnrollmentFormData) => {
    try {
      const response = await api.post('/enrollments', enrollmentData);
      return response.data;
    } catch (error: any) {
      throw error.response.data;
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
      throw error.response.data;
    }
  },
};