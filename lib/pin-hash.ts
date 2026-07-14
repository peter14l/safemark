import * as Crypto from "expo-crypto";

const SALT = "safemark_secure_salt_2026_"; // Application-wide salt

export async function hashPin(pin: string): Promise<string> {
  const input = `${pin}:${SALT}`;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}

export async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    // We cannot verify old Argon2 hashes without the native binary,
    // so we return false to handle it gracefully.
    return false;
  }
  const computed = await hashPin(pin);
  return computed === hash;
}

export async function needsRehash(encodedHash: string): Promise<boolean> {
  // If the hash starts with $argon2 (old format), mark it for rehashing
  return encodedHash.startsWith("$argon2");
}