import { supabase, isConfigured } from "./supabase";
import { sendLocalNotification } from "./notifications";
import { reverseGeocode } from "../lib/geocoding";

let lastSpeedAlert = 0;
const SPEED_ALERT_COOLDOWN = 60_000;

export async function checkSpeedAndAlert(
  latitude: number,
  longitude: number,
  speedMs: number,
  thresholdKmh: number = 120
): Promise<boolean> {
  const now = Date.now();
  if (now - lastSpeedAlert < SPEED_ALERT_COOLDOWN) return false;

  const speedKmh = speedMs * 3.6;
  if (speedKmh < thresholdKmh) return false;

  lastSpeedAlert = now;

  if (!isConfigured || !supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await supabase.from("speed_alerts").insert({
    user_id: user.id,
    speed_kmh: speedKmh,
    threshold_kmh: thresholdKmh,
    latitude,
    longitude,
  });

  await supabase.from("location_feed").insert({
    user_id: user.id,
    latitude,
    longitude,
    event_type: "speed_alert",
    marker_nickname: `Speed ${Math.round(speedKmh)} km/h`,
    address: await reverseGeocode(latitude, longitude),
  });

  await sendLocalNotification(
    "Speed Alert",
    `Traveling at ${Math.round(speedKmh)} km/h — above ${thresholdKmh} km/h threshold`
  );

  return true;
}

export async function getSpeedAlerts(
  userId: string,
  limit: number = 20
): Promise<{ speed_kmh: number; threshold_kmh: number; created_at: string }[]> {
  if (!isConfigured || !supabase) return [];

  const { data } = await supabase
    .from("speed_alerts")
    .select("speed_kmh, threshold_kmh, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
