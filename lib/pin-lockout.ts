import * as SecureStore from "expo-secure-store";

const FAILED_ATTEMPTS_KEY = "safemark_pin_failed_attempts";
const LOCKOUT_UNTIL_KEY = "safemark_pin_lockout_until";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function checkPinLockout(): Promise<{ allowed: boolean; remainingMs: number }> {
  const lockoutUntilStr = await SecureStore.getItemAsync(LOCKOUT_UNTIL_KEY);
  if (!lockoutUntilStr) return { allowed: true, remainingMs: 0 };

  const lockoutUntil = parseInt(lockoutUntilStr, 10);
  const now = Date.now();

  if (now >= lockoutUntil) {
    await SecureStore.deleteItemAsync(LOCKOUT_UNTIL_KEY);
    await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
    return { allowed: true, remainingMs: 0 };
  }

  return { allowed: false, remainingMs: lockoutUntil - now };
}

export async function recordFailedAttempt(): Promise<{ lockedOut: boolean; attemptsLeft: number }> {
  const attemptsStr = await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY);
  let attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
  attempts++;

  await SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, attempts.toString());

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    await SecureStore.setItemAsync(LOCKOUT_UNTIL_KEY, lockoutUntil.toString());
    return { lockedOut: true, attemptsLeft: 0 };
  }

  return { lockedOut: false, attemptsLeft: MAX_FAILED_ATTEMPTS - attempts };
}

export async function recordSuccess(): Promise<void> {
  await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(LOCKOUT_UNTIL_KEY);
}

export function formatLockoutTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}