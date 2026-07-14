import * as SecureStore from "expo-secure-store";
import { hashPin, verifyPinHash, needsRehash } from "./pin-hash";

const DECOY_PIN_KEY = "safemark_decoy_pin";

export async function getDecoyPinHash(): Promise<string | null> {
  return SecureStore.getItemAsync(DECOY_PIN_KEY);
}

export async function setDecoyPin(pin: string): Promise<void> {
  if (pin.length !== 6 || !/^\d+$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits");
  }
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(DECOY_PIN_KEY, hash);
}

export async function hasDecoyPin(): Promise<boolean> {
  const pin = await getDecoyPinHash();
  return pin !== null;
}

export async function verifyDecoyPin(pin: string): Promise<boolean> {
  const stored = await getDecoyPinHash();
  if (!stored) return false;
  const valid = await verifyPinHash(pin, stored);
  if (valid && await needsRehash(stored)) {
    await setDecoyPin(pin);
  }
  return valid;
}

export async function deleteDecoyPin(): Promise<void> {
  await SecureStore.deleteItemAsync(DECOY_PIN_KEY);
}