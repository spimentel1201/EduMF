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

export const enrollmentService = {
  createEnrollment: async (enrollmentData: EnrollmentFormData) => {
    try {
      const response = await api.post('/enrollments', enrollmentData);
      return response.data;
    } catch (error: any) {
      throw error.response.data;
    }
  },

  bulkEnrollStudents: async (file: File): Promise<BulkEnrollmentResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/enrollments/bulk', formData, {
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