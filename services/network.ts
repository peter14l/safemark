import { supabase, isConfigured } from "./supabase";
import { sendLocalNotification } from "./notifications";

let lastNetworkState: string | null = null;

export async function checkNetworkChange(): Promise<{
  changed: boolean;
  type: "wifi_change" | "cellular_change" | "offline" | "online" | null;
  ssid?: string;
}> {
  try {
    const Network = await import("expo-network");
    const networkState = await Network.getNetworkStateAsync();
    const isOnline = networkState.isConnected ?? false;
    const ipAddress = await Network.getIpAddressAsync();

    if (!isOnline) {
      if (lastNetworkState !== "offline") {
        lastNetworkState = "offline";
        return { changed: true, type: "offline" };
      }
      return { changed: false, type: null };
    }

    const currentState = ipAddress || "online";
    if (lastNetworkState === "offline" || lastNetworkState === null) {
      lastNetworkState = currentState;
      return { changed: true, type: "online" };
    }

    if (lastNetworkState !== currentState) {
      const previous = lastNetworkState;
      lastNetworkState = currentState;
      return { changed: true, type: "wifi_change", ssid: currentState };
    }

    return { changed: false, type: null };
  } catch {
    return { changed: false, type: null };
  }
}

export async function logNetworkEvent(
  eventType: "wifi_change" | "cellular_change" | "offline" | "online",
  ssid?: string,
  previousSsid?: string
): Promise<void> {
  if (!isConfigured || !supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("network_events").insert({
    user_id: user.id,
    event_type: eventType,
    ssid: ssid || null,
    previous_ssid: previousSsid || null,
  });

  await supabase.from("location_feed").insert({
    user_id: user.id,
    latitude: 0,
    longitude: 0,
    event_type: "network_change",
    marker_nickname: eventType === "offline" ? "Went offline" :
      eventType === "online" ? "Back online" :
      `Network changed`,
    address: null,
  });
}

export function resetNetworkState(): void {
  lastNetworkState = null;
}
