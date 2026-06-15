export interface InstitutionSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
  bgImageBase64?: string;
  bgOpacity?: number;
}

export interface InstitutionSettingsResponse {
  success: boolean;
  data: InstitutionSettings;
}
