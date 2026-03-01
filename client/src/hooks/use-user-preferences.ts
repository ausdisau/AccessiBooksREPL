import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserPreferences {
  defaultSpeed: number;
  preferredSections: string[];
}

export function useUserPreferences(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    enabled,
  });
  const updateMutation = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const res = await apiRequest("PATCH", "/api/user/preferences", prefs);
      return res.json() as Promise<UserPreferences>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/user/preferences"], updated);
    },
  });
  return {
    preferences: data ?? { defaultSpeed: 1, preferredSections: [] },
    isLoading,
    updatePreferences: updateMutation.mutateAsync,
  };
}
