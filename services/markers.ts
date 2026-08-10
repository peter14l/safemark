import { supabase, isConfigured } from "./supabase";
import { DEFAULT_RADIUS } from "../lib/constants";
import { validateNickname, validateCoordinate, validateRadius } from "../lib/validation";
import { randomUUID } from "expo-crypto";

export interface Marker {
  id: string;
  user_id: string;
  nickname: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
  created_at: string;
}

export async function createMarker(
  userId: string,
  nickname: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = DEFAULT_RADIUS
): Promise<Marker> {
  if (!validateNickname(nickname)) {
    throw new Error("Invalid nickname");
  }
  if (!validateCoordinate(latitude, longitude)) {
    throw new Error("Invalid coordinates");
  }
  if (!validateRadius(radiusMeters)) {
    throw new Error("Invalid radius");
  }

  if (!isConfigured || !supabase) {
    return {
      id: randomUUID(),
      user_id: userId,
      nickname,
      latitude,
      longitude,
      radius_meters: radiusMeters,
      active: true,
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("markers")
    .insert({
      user_id: userId,
      nickname,
      latitude,
      longitude,
      radius_meters: radiusMeters,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMarkers(userId: string): Promise<Marker[]> {
  if (!isConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("markers")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Marker[];
}

export async function updateMarker(
  markerId: string,
  updates: Partial<Pick<Marker, "nickname" | "radius_meters" | "active">>
): Promise<void> {
  if (!isConfigured || !supabase) return;

  if (updates.nickname !== undefined && !validateNickname(updates.nickname)) {
    throw new Error("Invalid nickname");
  }
  if (updates.radius_meters !== undefined && !validateRadius(updates.radius_meters)) {
    throw new Error("Invalid radius");
  }

  const { error } = await supabase
    .from("markers")
    .update(updates)
    .eq("id", markerId);

  if (error) throw error;
}

export async function deleteMarker(markerId: string): Promise<void> {
  if (!isConfigured || !supabase) return;

  const { error } = await supabase
    .from("markers")
    .update({ active: false })
    .eq("id", markerId);

  if (error) throw error;
}

export async function seedPresetMarkers(userId: string, email: string): Promise<void> {
  const targetEmails = ["baban012008@gmail.com", "petoorpoorkor20@gmail.com"];
  if (!targetEmails.includes(email.toLowerCase())) return;

  try {
    const existing = await getMarkers(userId);
    const presets = [
      { nickname: "Ruby", lat: 22.5134, lng: 88.4026 },
      { nickname: "College More", lat: 22.5735, lng: 88.4331 },
      { nickname: "Biswa Bangla", lat: 22.5791, lng: 88.4611 },
      { nickname: "Xavier's", lat: 22.5976, lng: 88.4984 }
    ];

    for (const preset of presets) {
      const found = existing.some(
        (m) => m.nickname.toLowerCase() === preset.nickname.toLowerCase() && m.active
      );
      if (!found) {
        await createMarker(userId, preset.nickname, preset.lat, preset.lng, 100);
      }
    }
  } catch (err) {
    console.error("Failed to seed preset markers:", err);
  }
}
