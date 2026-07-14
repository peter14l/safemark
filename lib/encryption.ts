import { getRandomBytes } from "expo-crypto";
import { readAsStringAsync, writeAsStringAsync, getInfoAsync, deleteAsync } from "expo-file-system/legacy";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt).buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToUint8(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function encryptFile(
  filePath: string,
  pin: string
): Promise<{ encryptedPath: string; metadata: EncryptionMetadata }> {
  const fileInfo = await getInfoAsync(filePath);
  if (!fileInfo.exists) throw new Error("File not found");

  const fileData = await readAsStringAsync(filePath, { encoding: "base64" });
  const data = base64ToUint8(fileData);

  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(pin, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv).buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedBytes, salt.length + iv.length);

  const encryptedBase64 = uint8ToBase64(combined);
  const encryptedPath = filePath.replace(".m4a", ".enc");

  await writeAsStringAsync(encryptedPath, encryptedBase64, { encoding: "base64" });

  const metadata: EncryptionMetadata = {
    algorithm: ALGORITHM,
    keyLength: 256,
    ivLength: IV_LENGTH,
    saltLength: SALT_LENGTH,
    iterations: ITERATIONS,
    originalSize: data.length,
    encryptedAt: Date.now(),
  };

  return { encryptedPath, metadata };
}

export async function decryptFile(
  encryptedPath: string,
  pin: string
): Promise<{ decryptedPath: string; metadata: EncryptionMetadata }> {
  const fileInfo = await getInfoAsync(encryptedPath);
  if (!fileInfo.exists) throw new Error("Encrypted file not found");

  const encryptedBase64 = await readAsStringAsync(encryptedPath, { encoding: "base64" });
  const combined = base64ToUint8(encryptedBase64);

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(pin, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv).buffer as ArrayBuffer },
      key,
      encryptedData.buffer as ArrayBuffer
    );
    const decryptedBytes = new Uint8Array(decrypted);

    const decryptedPath = encryptedPath.replace(".enc", ".m4a");
    const decryptedBase64 = uint8ToBase64(decryptedBytes);
    await writeAsStringAsync(decryptedPath, decryptedBase64, { encoding: "base64" });

    const metadata: EncryptionMetadata = {
      algorithm: ALGORITHM,
      keyLength: 256,
      ivLength: IV_LENGTH,
      saltLength: SALT_LENGTH,
      iterations: ITERATIONS,
      originalSize: decryptedBytes.length,
      encryptedAt: 0,
    };

    return { decryptedPath, metadata };
  } catch {
    throw new Error("Decryption failed - incorrect PIN");
  }
}

export interface EncryptionMetadata {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
  originalSize: number;
  encryptedAt: number;
}

export async function getEncryptionKeyFromPin(pin: string): Promise<CryptoKey> {
  const salt = getRandomBytes(SALT_LENGTH);
  return deriveKey(pin, salt);
}