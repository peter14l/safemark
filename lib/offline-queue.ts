import * as SecureStore from "expo-secure-store";
import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { supabase, isConfigured } from "../services/supabase";
import { encryptData, decryptData, EncryptedPayload } from "./queue-encryption";

const QUEUE_FILE_PATH = (documentDirectory || "") + "offline_queue.json";
const MAX_QUEUE_SIZE = 100;

export interface QueuedEvent {
  id: string;
  type: "location_update" | "geofence_crossing" | "heartbeat" | "breadcrumb" | "speed_alert" | "network_event" | "tamper_event";
  payload: EncryptedPayload | Record<string, unknown>;
  timestamp: number;
}

async function getQueueEncryptionKey(): Promise<string | null> {
  return SecureStore.getItemAsync("safemark_queue_key");
}

async function setQueueEncryptionKey(key: string): Promise<void> {
  await SecureStore.setItemAsync("safemark_queue_key", key);
}

async function ensureQueueKey(): Promise<string> {
  let key = await getQueueEncryptionKey();
  if (!key) {
    const { getRandomBytes } = await import("expo-crypto");
    const bytes = getRandomBytes(32);
    key = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    await setQueueEncryptionKey(key);
  }
  return key;
}

export async function getOfflineQueue(): Promise<QueuedEvent[]> {
  try {
    const info = await getInfoAsync(QUEUE_FILE_PATH);
    if (!info.exists) return [];
    const raw = await readAsStringAsync(QUEUE_FILE_PATH, { encoding: "utf8" });
    if (!raw) return [];
    return JSON.parse(raw) as QueuedEvent[];
  } catch (e) {
    console.error("Error reading offline queue file:", e);
    return [];
  }
}

function isEncryptedPayload(payload: any): payload is EncryptedPayload {
  return payload && typeof payload === "object" && "ciphertext" in payload && "iv" in payload;
}

export async function enqueueEvent(
  type: QueuedEvent["type"],
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const key = await ensureQueueKey();
    const encryptedPayload = await encryptData(JSON.stringify(payload), key);
    
    queue.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      payload: encryptedPayload,
      timestamp: Date.now(),
    });
    if (queue.length > MAX_QUEUE_SIZE) queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    await writeAsStringAsync(QUEUE_FILE_PATH, JSON.stringify(queue), { encoding: "utf8" });
  } catch (e) {
    console.error("Error enqueuing event:", e);
  }
}

export async function flushOfflineQueue(): Promise<number> {
  if (!isConfigured || !supabase) return 0;

  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;

  const key = await getQueueEncryptionKey();
  if (!key) return 0;

  let flushed = 0;
  const remaining: QueuedEvent[] = [];

  for (const event of queue) {
    try {
      const decryptedPayload = isEncryptedPayload(event.payload)
        ? JSON.parse(await decryptData(event.payload, key))
        : event.payload;
      
      switch (event.type) {
        case "location_update":
          await supabase.from("location_feed").insert({
            user_id: user.id,
            ...decryptedPayload,
            event_type: "location_update",
          });
          break;
        case "heartbeat":
          await supabase.from("heartbeats").insert({
            user_id: user.id,
            ...decryptedPayload,
          });
          break;
        case "breadcrumb":
          await supabase.from("breadcrumbs").insert({
            user_id: user.id,
            ...decryptedPayload,
          });
          break;
        case "speed_alert":
          await supabase.from("speed_alerts").insert({
            user_id: user.id,
            ...decryptedPayload,
          });
          break;
        case "network_event":
          await supabase.from("network_events").insert({
            user_id: user.id,
            ...decryptedPayload,
          });
          break;
        case "tamper_event":
          await supabase.from("tamper_events").insert({
            user_id: user.id,
            ...decryptedPayload,
          });
          break;
        default:
          break;
      }
      flushed++;
    } catch {
      remaining.push(event);
    }
  }

  await writeAsStringAsync(QUEUE_FILE_PATH, JSON.stringify(remaining), { encoding: "utf8" });
  return flushed;
}