export interface InstitutionSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
  bgImageBase64?: string;
  bgOpacity?: number;
  /** Horario oficial usado para validar la asistencia por QR. */
  horaIngreso?: string;
  horaSalida?: string;
  toleranciaMinutos?: number;
}

export interface InstitutionSettingsResponse {
  success: boolean;
  data: InstitutionSettings;
}
