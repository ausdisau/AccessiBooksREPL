import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SubscriptionStatus {
  subscriptionTier: "free" | "premium";
  subscriptionEndDate: string | null;
  stripeSubscriptionId: string | null;
  isPremium: boolean;
}

export function useSubscription() {
  const { data: subscription, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    retry: false,
    staleTime: 30000,
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
  });

  return {
    subscription,
    isLoading,
    isPremium: subscription?.isPremium ?? false,
    tier: subscription?.subscriptionTier ?? "free",
    upgradeToPremium: createCheckoutMutation.mutate,
    isUpgrading: createCheckoutMutation.isPending,
    cancelSubscription: cancelSubscriptionMutation.mutate,
    isCancelling: cancelSubscriptionMutation.isPending,
  };
}
