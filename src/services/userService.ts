import { api } from './api';

interface RegisterUserData {
  firstName: string;
  lastName: string;
  dni: string;
  gender: string;
  birthdate: string;
  email?: string;
  password?: string;
}

interface BulkRegisterUserResponse {
  msg: string;
  totalProcessed: number;
  successCount: number;
  errors: any[];
}
export const userService = {
  registerUser: async (userData: RegisterUserData) => {
    try {
      const response = await api.post('/users/register', userData);
      return response.data;
    } catch (error: any) {
      throw error.response.data;
    }
  },

  bulkRegisterUsers: async (file: File): Promise<BulkRegisterUserResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/users/bulk-register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response.data;
    }
  },

  getAll: async () => {
    const response = await api.get('/users');
    return response.data.data.map((user: any) => ({
      ...user,
      name: `${user.firstName} ${user.lastName}`,
      status: user.status === 'active' ? 'Activo' : 'Inactivo',
    }));
  },
};