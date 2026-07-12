import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { TASK_NAME, LOCATION_POLL_INTERVAL } from "../lib/constants";
import { haversineDistance } from "../lib/geofence";
import { sendLocalNotification } from "./notifications";
import { supabase, isConfigured } from "./supabase";
import { setTrackingPreference } from "../lib/securestore";

const lastCrossingState = new Map<string, boolean>();
let lastFeedUpdate = 0;
const FEED_UPDATE_INTERVAL = 60_000;

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Location task error:", error);
    return;
  }

  if (!isConfigured || !supabase) return;

  const locations = (data as { locations: Location.LocationObject[] })?.locations;
  if (!locations?.length) return;

  const location = locations[0];
  const { latitude, longitude, accuracy } = location.coords;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Share location update to feed (throttled to every 60s)
    const now = Date.now();
    if (now - lastFeedUpdate > FEED_UPDATE_INTERVAL) {
      lastFeedUpdate = now;
      await supabase.from("location_feed").insert({
        user_id: user.id,
        latitude,
        longitude,
        accuracy,
        event_type: "location_update",
      });
    }

    // Check geofences
    const { data: markers } = await supabase
      .from("markers")
      .select("id, nickname, radius_meters")
      .eq("user_id", user.id)
      .eq("active", true);

    if (!markers?.length) return;

    for (const marker of markers) {
      const { data: markerLocation } = await supabase.rpc("get_marker_location", {
        marker_id: marker.id,
      });

      if (!markerLocation) continue;

      const dist = haversineDistance(
        latitude,
        longitude,
        markerLocation.latitude,
        markerLocation.longitude
      );

      const isInside = dist <= marker.radius_meters;
      const wasInside = lastCrossingState.get(marker.id) ?? false;

      if (isInside && !wasInside) {
        lastCrossingState.set(marker.id, true);

        // Log crossing event
        await supabase.from("geofence_events").insert({
          user_id: user.id,
          marker_id: marker.id,
          event_type: "entered",
          latitude,
          longitude,
        });

        // Add to feed
        await supabase.from("location_feed").insert({
          user_id: user.id,
          latitude,
          longitude,
          accuracy,
          event_type: "geofence_crossing",
          marker_nickname: marker.nickname,
        });

        // Local notification
        await sendLocalNotification(
          "Safe Check-In",
          `You crossed ${marker.nickname}`
        );

        // Push to partner via edge function
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: user.id,
            marker_id: marker.id,
            marker_nickname: marker.nickname,
          },
        }).catch((err) =>
          console.error("Edge function invoke failed:", err)
        );
      } else if (!isInside && wasInside) {
        lastCrossingState.set(marker.id, false);
      }
    }
  } catch (err) {
    console.error("Geofence check error:", err);
  }
});

export async function startLocationTracking(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") return false;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== "granted") return false;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (isRunning) {
    await setTrackingPreference(true);
    return true;
  }

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 20,
    deferredUpdatesInterval: LOCATION_POLL_INTERVAL,
    deferredUpdatesDistance: 20,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: "Calc",
      notificationBody: "Tracking location for safety",
      notificationColor: "#6C63FF",
      killServiceOnDestroy: false,
    },
  });

  await setTrackingPreference(true);
  return true;
}

export async function stopLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  await setTrackingPreference(false);
}

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TASK_NAME);
}
