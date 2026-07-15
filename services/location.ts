import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";
import { TASK_NAME, LOCATION_POLL_INTERVAL, HEARTBEAT_INTERVAL_MIN, SPEED_THRESHOLD_KMH, BREADCRUMB_MAX_COUNT } from "../lib/constants";
import { haversineDistance } from "../lib/geofence";
import { sendLocalNotification } from "./notifications";
import { supabase, isConfigured } from "./supabase";
import { setTrackingPreference } from "../lib/securestore";
import { checkTripArrival } from "./trips";
import { sendHeartbeat } from "./heartbeat";
import { checkSpeedAndAlert } from "./speed";
import { checkNetworkChange, logNetworkEvent } from "./network";
import { enqueueEvent, flushOfflineQueue } from "../lib/offline-queue";
import { getSettings } from "../lib/settings";
import { reverseGeocode } from "../lib/geocoding";

let cachedUserId: string | null = null;
const lastCrossingState = new Map<string, boolean>();
let lastFeedUpdate = 0;
const FEED_UPDATE_INTERVAL = 60_000;
let lastBreadcrumbTime = 0;
const BREADCRUMB_INTERVAL = 60_000;
let lastNetworkCheck = 0;
const NETWORK_CHECK_INTERVAL = 120_000;

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Location task error:", error);
    return;
  }

  const locations = (data as { locations: Location.LocationObject[] })?.locations;
  if (!locations?.length) return;

  const location = locations[0];
  const { latitude, longitude, accuracy, speed } = location.coords;

  try {
    // Flush offline queue when we have connectivity
    if (isConfigured && supabase) {
      await flushOfflineQueue();
    }

    if (!isConfigured || !supabase) return;

    // Use cached user ID or fetch from local session synchronously without network overhead
    let userId = cachedUserId;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        cachedUserId = session.user.id;
        userId = session.user.id;
      }
    }
    if (!userId) return;

    const settings = await getSettings();

    // Helper to lazy-load reverse geocode address once per tick
    let cachedAddress: string | null = null;
    const getAddress = async () => {
      if (!cachedAddress) {
        cachedAddress = await reverseGeocode(latitude, longitude);
      }
      return cachedAddress;
    };

    const now = Date.now();

    // Share location update to feed (throttled)
    if (now - lastFeedUpdate > FEED_UPDATE_INTERVAL) {
      lastFeedUpdate = now;
      const address = await getAddress();
      await supabase.from("location_feed").insert({
        user_id: userId,
        latitude,
        longitude,
        accuracy,
        event_type: "location_update",
        address,
      });
    }

    // Breadcrumbs trail
    if (now - lastBreadcrumbTime > BREADCRUMB_INTERVAL) {
      lastBreadcrumbTime = now;
      const address = await getAddress();
      const { error: bcErr } = await supabase.from("breadcrumbs").insert({
        user_id: userId,
        latitude,
        longitude,
        speed: speed ?? null,
        heading: location.coords.heading ?? null,
        address,
      });

      if (bcErr) {
        await enqueueEvent("breadcrumb", {
          latitude,
          longitude,
          speed: speed ?? null,
          heading: location.coords.heading ?? null,
        });
      }

      // Prune old breadcrumbs
      const { data: bcCount } = await supabase
        .from("breadcrumbs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (bcCount && (bcCount as any).count > BREADCRUMB_MAX_COUNT) {
        const { data: oldBc } = await supabase
          .from("breadcrumbs")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit((bcCount as any).count - BREADCRUMB_MAX_COUNT);

        if (oldBc?.length) {
          const ids = oldBc.map((b) => b.id);
          await supabase.from("breadcrumbs").delete().in("id", ids);
        }
      }
    }

    // Heartbeat
    let batteryLevel: number | undefined;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch {}
    await sendHeartbeat(latitude, longitude, batteryLevel);

    // Speed alert
    if (speed && speed > 0) {
      await checkSpeedAndAlert(
        latitude,
        longitude,
        speed,
        settings.speedThresholdKmh
      );
    }

    // Network change check (throttled)
    if (now - lastNetworkCheck > NETWORK_CHECK_INTERVAL) {
      lastNetworkCheck = now;
      const networkResult = await checkNetworkChange();
      if (networkResult.changed && networkResult.type) {
        await logNetworkEvent(
          networkResult.type,
          networkResult.ssid,
          undefined
        );
      }
    }

    // Check geofences - fetch latitude and longitude directly to avoid N+1 RPC network requests
    const { data: markers } = await supabase
      .from("markers")
      .select("id, nickname, radius_meters, latitude, longitude")
      .eq("user_id", userId)
      .eq("active", true);

    if (!markers?.length) return;

    for (const marker of markers) {
      if (marker.latitude === null || marker.longitude === null) continue;

      const dist = haversineDistance(
        latitude,
        longitude,
        marker.latitude,
        marker.longitude
      );

      const isInside = dist <= marker.radius_meters;
      const wasInside = lastCrossingState.get(marker.id) ?? false;

      if (isInside && !wasInside) {
        lastCrossingState.set(marker.id, true);

        await supabase.from("geofence_events").insert({
          user_id: userId,
          marker_id: marker.id,
          event_type: "entered",
          latitude,
          longitude,
        });

        const address = await getAddress();
        await supabase.from("location_feed").insert({
          user_id: userId,
          latitude,
          longitude,
          accuracy,
          event_type: "geofence_crossing",
          marker_nickname: marker.nickname,
          address,
        });

        await sendLocalNotification(
          "Safe Check-In",
          `You crossed ${marker.nickname}`
        );

        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: userId,
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

    // Check trip arrival
    await checkTripArrival(latitude, longitude, accuracy);
  } catch (err) {
    console.error("Location task error:", err);
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
  cachedUserId = null;
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  await setTrackingPreference(false);
}

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TASK_NAME);
}

