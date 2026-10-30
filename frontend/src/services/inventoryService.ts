import { api } from './api';
import { saveAs } from 'file-saver';
import type {
  InventoryAmbiente,
  InventoryImportPreview,
  InventoryImportResult,
  InventoryItem,
  InventoryLabelData,
  InventoryListParams,
  InventoryListResponse,
  InventoryStats,
  PublicInventoryItem,
} from '@/types/inventory';

export const inventoryService = {
  getAll: async (params: InventoryListParams = {}): Promise<InventoryListResponse> => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  getById: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  create: async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.post('/inventory', item);
    return response.data.data;
  },

  update: async (id: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.put(`/inventory/${id}`, item);
    return response.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  getStats: async (): Promise<InventoryStats> => {
    const response = await api.get('/inventory/stats');
    return response.data.data;
  },

  getAmbientes: async (): Promise<InventoryAmbiente[]> => {
    const response = await api.get('/inventory/ambientes');
    return response.data.data;
  },

  createAmbiente: async (nombre: string): Promise<InventoryAmbiente> => {
    const response = await api.post('/inventory/ambientes', { nombre });
    return response.data.data;
  },

  previewImport: async (file: File): Promise<InventoryImportPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  commitImport: async (file: File): Promise<InventoryImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/import/commit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  downloadTemplate: async (): Promise<void> => {
    const response = await api.get('/inventory/template', { responseType: 'blob' });
    saveAs(response.data, 'plantilla-inventario.xlsx');
  },

  getLabels: async (ids: string[]): Promise<InventoryLabelData[]> => {
    const response = await api.get('/inventory/labels', {
      params: { ids: ids.join(',') },
    });
    return response.data.data;
  },

  getPublicItem: async (codigoInterno: string): Promise<PublicInventoryItem> => {
    const response = await api.get(
      `/inventory/public/${encodeURIComponent(codigoInterno)}`
    );
    return response.data.data;
  },
};
