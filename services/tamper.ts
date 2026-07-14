import { AppState, AppStateStatus } from "react-native";
import { supabase, isConfigured } from "./supabase";
import { sendLocalNotification } from "./notifications";

let appStateSubscription: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = "active";

export function startTamperDetection(): void {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener("change", async (nextState) => {
    if (lastAppState === "active" && nextState === "background") {
      // App going to background - potential force stop risk
    }
    lastAppState = nextState;
  });
}

export async function reportTamperEvent(
  eventType: "force_stopped" | "service_killed" | "permission_revoked",
  details?: string
): Promise<void> {
  if (!isConfigured || !supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("tamper_events").insert({
    user_id: user.id,
    event_type: eventType,
    details: details || null,
  });

  await supabase.from("location_feed").insert({
    user_id: user.id,
    latitude: 0,
    longitude: 0,
    event_type: "tamper_detected",
    marker_nickname: eventType === "force_stopped" ? "App was force-stopped" :
      eventType === "service_killed" ? "Tracking service killed" :
      "Permissions revoked",
    address: null,
  });

  await sendLocalNotification(
    "Tamper Detected",
    "Your partner may have been compromised. Check the feed."
  );
}

export function stopTamperDetection(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
}
