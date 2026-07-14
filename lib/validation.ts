export const NICKNAME_MAX_LENGTH = 50;
export const NICKNAME_MIN_LENGTH = 1;
export const MIN_RADIUS = 10;
export const MAX_RADIUS = 5000;
export const MIN_LAT = -90;
export const MAX_LAT = 90;
export const MIN_LNG = -180;
export const MAX_LNG = 180;

export function validateNickname(nickname: string): boolean {
  if (typeof nickname !== "string") return false;
  const trimmed = nickname.trim();
  if (trimmed.length < NICKNAME_MIN_LENGTH || trimmed.length > NICKNAME_MAX_LENGTH) return false;
  // Allow alphanumeric, spaces, hyphens, underscores, and common punctuation
  return /^[\p{L}\p{N}\s\-_.,()]+$/u.test(trimmed);
}

export function validateCoordinate(latitude: number, longitude: number): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return (
    latitude >= MIN_LAT &&
    latitude <= MAX_LAT &&
    longitude >= MIN_LNG &&
    longitude <= MAX_LNG
  );
}

export function validateRadius(radius: number): boolean {
  if (typeof radius !== "number") return false;
  if (!Number.isFinite(radius)) return false;
  return radius >= MIN_RADIUS && radius <= MAX_RADIUS;
}

export function validatePhoneNumber(phone: string): boolean {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15 && /^\+?\d+$/.test(cleaned);
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function validateDisplayName(name: string): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 && /^[\p{L}\p{N}\s\-_'.]+$/u.test(trimmed);
}

export function sanitizeTextInput(input: string, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}