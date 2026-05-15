export interface InstitutionSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
}

export interface InstitutionSettingsResponse {
  success: boolean;
  data: InstitutionSettings;
}
