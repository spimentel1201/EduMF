import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionSettingsService } from '@/services/institutionSettingsService';
import type { InstitutionSettings } from '@/types/institution';

const QUERY_KEY = ['institutionSettings'] as const;
const PUBLIC_QUERY_KEY = ['institutionSettingsPublic'] as const;

export function useInstitutionSettings() {
  return useQuery<InstitutionSettings>({
    queryKey: QUERY_KEY,
    queryFn: institutionSettingsService.getSettings,
    staleTime: 5 * 60 * 1000,  // 5 minutos — datos institucionales cambian raramente
    gcTime:    10 * 60 * 1000, // 10 minutos en caché
  });
}

/** Hook para la pantalla de login (sin autenticación requerida) */
export function usePublicInstitutionSettings() {
  return useQuery({
    queryKey: PUBLIC_QUERY_KEY,
    queryFn: institutionSettingsService.getPublicSettings,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    retry: false, // Si no hay config aún, no reintentar
  });
}

export function useUpdateInstitutionSettings() {
  const queryClient = useQueryClient();

  return useMutation<InstitutionSettings, Error, InstitutionSettings>({
    mutationFn: institutionSettingsService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_QUERY_KEY });
    },
  });
}
