export type DniSexo = 'M' | 'F';
export type DniDonacion = 'Si' | 'No';

export interface DniEscolar {
  id: string;
  cui: string;
  primerApellido: string;
  segundoApellido?: string;
  preNombres: string;
  sexo: DniSexo;
  fechaNacimiento?: string;
  ubigeoNacimiento?: string;

  fotoBase64?: string;

  fechaInscripcion?: string;
  fechaEmision?: string;
  fechaCaducidad?: string;

  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  observaciones?: string;
  donacionOrganos: DniDonacion;

  studentId?: string;
  anio: number;
  notas?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DniEscolarListParams {
  page?: number;
  limit?: number;
  search?: string;
  sexo?: string;
  anio?: number | string;
  conFoto?: 'si' | 'no';
}

export interface DniEscolarListResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: DniEscolar[];
}

export interface DniEscolarStats {
  total: number;
  conFoto: number;
  sinFoto: number;
  porAnio: { _id: number; count: number }[];
}

export interface StudentBySection {
  _id: string;
  firstName: string;
  lastName: string;
  dni: string;
}

export interface GenerarDesdeMatriculaPayload {
  sectionId: string;
  studentIds?: string[];
  anio?: number;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
}

export interface GenerarDesdeMatriculaResult {
  creados: number;
  omitidos: { nombre: string; motivo: string }[];
  dnis: DniEscolar[];
}

export interface SubirFotosPayload {
  fotos: { cui: string; fotoBase64: string }[];
}

export interface SubirFotosResult {
  totalEnviadas: number;
  actualizadas: number;
  noEncontradas: string[];
  invalidas: string[];
}
