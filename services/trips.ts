import { supabase, isConfigured } from "./supabase";
import { getActiveTripId, setActiveTripId } from "../lib/securestore";
import { sendLocalNotification } from "./notifications";

export interface Trip {
  id: string;
  user_id: string;
  start_lat: number;
  start_lng: number;
  start_name: string;
  end_lat: number;
  end_lng: number;
  end_name: string;
  status: "active" | "completed" | "cancelled";
  arrival_radius_m: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

let lastTripCheck = 0;
const TRIP_CHECK_INTERVAL = 30_000;

export async function createTrip(
  startLat: number,
  startLng: number,
  startName: string,
  endLat: number,
  endLng: number,
  endName: string,
  arrivalRadius: number = 50
): Promise<Trip | null> {
  if (!isConfigured || !supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      start_lat: startLat,
      start_lng: startLng,
      start_name: startName || "Start",
      end_lat: endLat,
      end_lng: endLng,
      end_name: endName || "Destination",
      status: "active",
      arrival_radius_m: arrivalRadius,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Create trip error:", error);
    return null;
  }

  await supabase.from("trip_events").insert({
    trip_id: data.id,
    user_id: user.id,
    event_type: "started",
    latitude: startLat,
    longitude: startLng,
  });

  await setActiveTripId(data.id);
  return data as Trip;
}

export async function getActiveTrip(): Promise<Trip | null> {
  if (!isConfigured || !supabase) return null;

  const tripId = await getActiveTripId();
  if (!tripId) return null;

  const { data } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("status", "active")
    .single();

  if (!data) {
    await setActiveTripId(null);
    return null;
  }

  return data as Trip;
}

export async function getTripHistory(userId: string): Promise<Trip[]> {
  if (!isConfigured || !supabase || !userId) return [];

  const { data } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["completed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []) as Trip[];
}

export async function completeTrip(
  tripId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  if (!isConfigured || !supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: trip } = await supabase
    .from("trips")
    .select("end_name")
    .eq("id", tripId)
    .single();

  await supabase
    .from("trips")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", tripId);

  await supabase.from("trip_events").insert({
    trip_id: tripId,
    user_id: user.id,
    event_type: "arrived_end",
    latitude: lat,
    longitude: lng,
  });

  const pointName = trip?.end_name || "destination";

  const { data: partnerData } = await supabase.rpc("notify_partner_trip_arrival", {
    p_trip_id: tripId,
    p_arrival_lat: lat,
    p_arrival_lng: lng,
    p_point_name: pointName,
  });

  await sendLocalNotification(
    "Trip Complete",
    `You arrived at ${pointName}`
  );

  if (partnerData && partnerData.length > 0) {
    const partner = partnerData[0];
    await supabase.functions.invoke("send-notification", {
      body: {
        user_id: user.id,
        title: "Arrival Update",
        body: `She arrived at ${pointName}`,
      },
    }).catch((err) => console.error("Push notification failed:", err));
  }

  await setActiveTripId(null);
  return true;
}

export async function cancelTrip(tripId: string): Promise<boolean> {
  if (!isConfigured || !supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await supabase
    .from("trips")
    .update({ status: "cancelled" })
    .eq("id", tripId);

  await supabase.from("trip_events").insert({
    trip_id: tripId,
    user_id: user.id,
    event_type: "cancelled",
  });

  await setActiveTripId(null);
  return true;
}

export async function checkTripArrival(
  lat: number,
  lng: number,
  accuracy: number | null
): Promise<void> {
  const now = Date.now();
  if (now - lastTripCheck < TRIP_CHECK_INTERVAL) return;
  lastTripCheck = now;

  const trip = await getActiveTrip();
  if (!trip) return;

  const { haversineDistance } = await import("../lib/geofence");
  const distToDest = haversineDistance(lat, lng, trip.end_lat, trip.end_lng);

  const gpsAccuracyGuard = (accuracy ?? 50) * 2;

  if (distToDest <= trip.arrival_radius_m && distToDest <= gpsAccuracyGuard) {
    await completeTrip(trip.id, lat, lng);
  }
}

export function resetTripCheckThrottle(): void {
  lastTripCheck = 0;
}
