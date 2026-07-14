import * as SecureStore from "expo-secure-store";
import { PIN_LENGTH } from "./constants";
import { hashPin, verifyPinHash, needsRehash } from "./pin-hash";

const PIN_KEY = "safemark_pin";

export async function getPinHash(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function setPin(pin: string): Promise<void> {
  if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits");
  }
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, hash);
}

export async function hasPin(): Promise<boolean> {
  const pin = await getPinHash();
  return pin !== null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getPinHash();
  if (!stored) return false;
  const valid = await verifyPinHash(pin, stored);
  if (valid && await needsRehash(stored)) {
    await setPin(pin);
  }
  return valid;
}

export async function deletePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

const TRACKING_KEY = "safemark_tracking_enabled";

export async function getTrackingPreference(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(TRACKING_KEY);
  return val === "true";
}

export async function setTrackingPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(TRACKING_KEY, enabled ? "true" : "false");
}

const ACTIVE_TRIP_KEY = "safemark_active_trip_id";

export async function getActiveTripId(): Promise<string | null> {
  return SecureStore.getItemAsync(ACTIVE_TRIP_KEY);
}

export async function setActiveTripId(tripId: string | null): Promise<void> {
  if (tripId) {
    await SecureStore.setItemAsync(ACTIVE_TRIP_KEY, tripId);
  } else {
    await SecureStore.deleteItemAsync(ACTIVE_TRIP_KEY);
  }
}

const ONBOARDING_KEY = "safemark_onboarding_complete";

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return val === "true";
}

export async function completeOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
}
