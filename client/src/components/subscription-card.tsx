import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

const PREMIUM_FEATURES = [
  "Ad-free listening experience",
  "Unlimited bookmarks",
  "Offline playback (coming soon)",
  "Priority customer support",
  "Early access to new features",
  "Enhanced playback controls",
];

export function SubscriptionCard() {
  const { 
    isPremium, 
    tier, 
    upgradeToPremium, 
    isUpgrading,
    cancelSubscription,
    isCancelling,
    subscription
  } = useSubscription();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Crown className={`h-10 w-10 ${isPremium ? "text-amber-500" : "text-muted-foreground"}`} />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          {isPremium ? "Premium Member" : "Free Plan"}
          {isPremium && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isPremium 
            ? "You have access to all premium features" 
            : "Upgrade to unlock all features"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isPremium && (
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">
              $9.99
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cancel anytime
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {PREMIUM_FEATURES.map((feature, index) => (
            <li key={index} className="flex items-center gap-3">
              <Check className={`h-5 w-5 ${isPremium ? "text-green-500" : "text-muted-foreground"}`} />
              <span className={isPremium ? "text-foreground" : "text-muted-foreground"}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {isPremium ? (
          <div className="space-y-3">
            {subscription?.subscriptionEndDate && (
              <p className="text-sm text-center text-muted-foreground">
                Renews on {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => cancelSubscription()}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={() => upgradeToPremium()}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading checkout...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
