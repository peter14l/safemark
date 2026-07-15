import { getRandomBytes } from "expo-crypto";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

async function importKey(password: string): Promise<CryptoKey> {
  const keyBytes = hexToUint8(password);
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export interface EncryptedPayload {
  salt: string;
  iv: string;
  ciphertext: string;
  authTag: string;
  algorithm: string;
}

export async function encryptData(data: string, password: string): Promise<EncryptedPayload> {
  const iv = getRandomBytes(IV_LENGTH);
  const key = await importKey(password);

  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoded
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(-16);
  const ciphertext = encryptedBytes.slice(0, -16);

  return {
    salt: "", // No longer needed for key derivation, kept for type compatibility
    iv: uint8ToHex(iv),
    ciphertext: uint8ToHex(ciphertext),
    authTag: uint8ToHex(authTag),
    algorithm: ALGORITHM,
  };
}

export async function decryptData(
  encrypted: EncryptedPayload,
  password: string
): Promise<string> {
  const iv = hexToUint8(encrypted.iv);
  const ciphertext = hexToUint8(encrypted.ciphertext);
  const authTag = hexToUint8(encrypted.authTag);

  const key = await importKey(password);

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
      key,
      combined
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Decryption failed - invalid password or corrupted data");
  }
}