import { api } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  dni: string;
  status: 'Activo' | 'Inactivo';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  dni: string;
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.data; // Extraer del objeto data
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data.data; // Extraer del objeto data
  },

  create: async (user: CreateUserData): Promise<User> => {
    const response = await api.post('/users', user);
    return response.data.data; // Extraer del objeto data
  },

  update: async (id: string, user: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, user);
    return response.data.data; // Extraer del objeto data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};