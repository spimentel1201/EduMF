import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

export const guardianApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

guardianApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('guardianToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setGuardianToken(token: string | null) {
  if (token) localStorage.setItem('guardianToken', token);
  else localStorage.removeItem('guardianToken');
}
