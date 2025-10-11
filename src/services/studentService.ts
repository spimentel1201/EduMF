import { api } from './api';
import { Student } from '../types/users';

export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    const response = await api.get('/users', { params: { role: 'student' } });
    return response.data.data;
  },
};