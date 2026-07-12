import * as SecureStore from "expo-secure-store";
import { PIN_LENGTH } from "./constants";

const PIN_KEY = "safemark_pin";

export async function getPin(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function setPin(pin: string): Promise<void> {
  if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits");
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function hasPin(): Promise<boolean> {
  const pin = await getPin();
  return pin !== null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getPin();
  return stored === pin;
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
