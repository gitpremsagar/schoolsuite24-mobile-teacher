import { router } from "expo-router";
import { errorMessage, isSubscriptionInactive } from "@/lib/api/subscription";

/** Returns a user-facing message for a failed request, or "" when err is nullish. */
export function handleApiError(err: unknown, fallback: string): string {
  if (err == null) return "";
  if (isSubscriptionInactive(err)) {
    queueMicrotask(() => {
      router.replace("/access-blocked");
    });
    return "Subscription inactive";
  }
  return errorMessage(err, fallback);
}
