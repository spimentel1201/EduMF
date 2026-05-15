import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionSettingsService } from '@/services/institutionSettingsService';
import type { InstitutionSettings } from '@/types/institution';

const QUERY_KEY = ['institutionSettings'] as const;

export function useInstitutionSettings() {
  return useQuery<InstitutionSettings>({
    queryKey: QUERY_KEY,
    queryFn: institutionSettingsService.getSettings,
    staleTime: 5 * 60 * 1000,  // 5 minutos — datos institucionales cambian raramente
    gcTime:    10 * 60 * 1000, // 10 minutos en caché
  });
}

export function useUpdateInstitutionSettings() {
  const queryClient = useQueryClient();

  return useMutation<InstitutionSettings, Error, InstitutionSettings>({
    mutationFn: institutionSettingsService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
