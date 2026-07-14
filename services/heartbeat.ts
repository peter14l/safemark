import { supabase, isConfigured } from "./supabase";
import { sendLocalNotification } from "./notifications";

let lastHeartbeat = 0;
let heartbeatInterval = 5 * 60 * 1000;

export function setHeartbeatInterval(minutes: number): void {
  heartbeatInterval = minutes * 60 * 1000;
}

export async function sendHeartbeat(
  latitude: number,
  longitude: number,
  batteryLevel?: number
): Promise<boolean> {
  const now = Date.now();
  if (now - lastHeartbeat < heartbeatInterval) return false;
  lastHeartbeat = now;

  if (!isConfigured || !supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await supabase.from("heartbeats").insert({
    user_id: user.id,
    latitude,
    longitude,
    battery_level: batteryLevel ?? null,
  });

  return true;
}

export async function getHeartbeats(
  userId: string,
  limit: number = 20
): Promise<{ latitude: number; longitude: number; created_at: string; battery_level: number | null }[]> {
  if (!isConfigured || !supabase) return [];

  const { data } = await supabase
    .from("heartbeats")
    .select("latitude, longitude, created_at, battery_level")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export function resetHeartbeatThrottle(): void {
  lastHeartbeat = 0;
}
