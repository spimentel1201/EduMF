export type InventoryEstado = 'B' | 'R' | 'N' | '';
export type InventoryTipoBien = 'activo_fijo' | 'bien_menor';

export interface InventoryAmbiente {
  id: string;
  nombre: string;
  codigo?: string;
  tipo?: string;
  descripcion?: string;
  activo: boolean;
}

export interface InventoryItem {
  id: string;
  codigoInterno: string;
  codigoSBNGeneral?: string;
  codigoSBNCorrelativo?: string;

  nombre: string;
  marca?: string;
  tipo?: string;
  modelo?: string;
  serieDimensiones?: string;
  color?: string;
  otros?: string;

  cantidad: number;
  unidadMedida: string;

  ubicacion?: string;
  ambiente?: InventoryAmbiente | string | null;

  estado?: InventoryEstado;
  condicion?: string;
  tipoBien: InventoryTipoBien;

  fechaIngreso?: string;
  entidadDependencia?: string;
  documentoSustentatorio?: string;
  fechaDocumento?: string;

  cuenta?: string;
  subCuenta?: string;

  valorUnitario: number;
  valorTotal: number;

  anioInventario: number;
  notas?: string;

  createdAt: string;
  updatedAt: string;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  ambiente?: string;
  estado?: string;
  tipoBien?: string;
  anio?: number | string;
}

export interface InventoryListResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: InventoryItem[];
}

export interface InventoryStats {
  totalBienes: number;
  totalUnidades: number;
  valorTotal: number;
  porEstado: { _id: string; count: number }[];
  porAmbiente: { ambiente: string; count: number; valor: number }[];
}

export interface InventoryLabelData {
  id: string;
  codigoInterno: string;
  codigoSBN: string;
  nombre: string;
  ambiente: string;
  estado?: InventoryEstado;
  anioInventario: number;
  qrDataUrl: string;
}

export interface InventoryImportRow {
  filaExcel: number;
  codigoSBNGeneral: string;
  codigoSBNCorrelativo: string;
  nombre: string;
  marca: string;
  modelo: string;
  cantidad: number;
  unidadMedida: string;
  ubicacion: string;
  estado: InventoryEstado;
  condicion: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface InventoryImportPreview {
  sheetName: string;
  totalFilas: number;
  columnas: Record<string, number>;
  advertencias: string[];
  filas: InventoryImportRow[];
}

export interface InventoryImportResult {
  sheetName: string;
  totalFilas: number;
  insertados: number;
  ambientesCreados: number;
  advertencias: string[];
  errores: { fila: number; mensaje: string }[];
}

export interface PublicInventoryItem {
  id: string;
  codigoInterno: string;
  codigoSBNGeneral?: string;
  codigoSBNCorrelativo?: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  serieDimensiones?: string;
  color?: string;
  cantidad: number;
  unidadMedida: string;
  ubicacion?: string;
  estado?: InventoryEstado;
  condicion?: string;
  tipoBien: InventoryTipoBien;
  anioInventario: number;
  ambiente?: InventoryAmbiente | null;
}
