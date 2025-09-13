import { api } from './api';

export interface LoginCredentials {
  dni: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data.data; // Extraer de response.data.data
  },

  loginWithQR: async (qrData: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/qr-login', { qrData });
    return response.data.data; // Extraer de response.data.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.data; // Extraer de response.data.data
  },
};