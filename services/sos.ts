import * as SMS from "expo-sms";
import * as Location from "expo-location";
import { getEmergencyContacts, EmergencyContact } from "../lib/contacts";
import { startAudioRecording, stopAudioRecording, getClipCount } from "./audioRecorder";
import { supabase, isConfigured } from "./supabase";
import { getSessionPin, clearSessionPin } from "./session-pin";

let sosActive = false;
let sosStartTime = 0;

export function isSOSActive(): boolean {
  return sosActive;
}

export function getSOSStartTime(): number {
  return sosStartTime;
}

export async function activateSOS(): Promise<{
  smsResults: { contact: string; sent: boolean }[];
  location: { lat: number; lng: number } | null;
}> {
  const contacts = await getEmergencyContacts();
  if (contacts.length === 0) {
    throw new Error("No emergency contacts added. Add contacts first.");
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  let location: { lat: number; lng: number } | null = null;
  let locationUrl = "";

  if (status === "granted") {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    location = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    };
    locationUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  }

  const message = location
    ? `SOS EMERGENCY! I need help. My current location: ${locationUrl}\n-Sent from SafeMark`
    : `SOS EMERGENCY! I need help. Location unavailable.\n-Sent from SafeMark`;

  const smsResults: { contact: string; sent: boolean }[] = [];

  for (const contact of contacts) {
    try {
      const available = await SMS.isAvailableAsync();
      if (available) {
        const { result } = await SMS.sendSMSAsync([contact.phone], message);
        smsResults.push({ contact: contact.name, sent: result === "sent" });
      } else {
        smsResults.push({ contact: contact.name, sent: false });
      }
    } catch {
      smsResults.push({ contact: contact.name, sent: false });
    }
  }

  // Start audio recording with session PIN for encryption
  await startAudioRecording();

  sosActive = true;
  sosStartTime = Date.now();

  // Log to Supabase
  if (isConfigured && supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && location) {
        await supabase.from("sos_events").insert({
          user_id: user.id,
          latitude: location.lat,
          longitude: location.lng,
          sms_sent_to: smsResults.map((r) => ({
            name: r.contact,
            sent: r.sent,
          })),
        });

        // Notify partner via feed
        await supabase.rpc("notify_partner_sos", {
          p_user_id: user.id,
          p_latitude: location.lat,
          p_longitude: location.lng,
        });
      }
    } catch (err) {
      console.error("SOS log error:", err);
    }
  }

  return { smsResults, location };
}

export async function deactivateSOS(): Promise<number> {
  await stopAudioRecording();
  clearSessionPin();
  const clips = await getClipCount();
  sosActive = false;

  // Update Supabase
  if (isConfigured && supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("sos_events")
          .update({
            deactivated_at: new Date().toISOString(),
            status: "resolved",
            audio_recordings_count: clips,
          })
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("activated_at", { ascending: false })
          .limit(1);
      }
    } catch (err) {
      console.error("SOS deactivate log error:", err);
    }
  }

  return clips;
}
