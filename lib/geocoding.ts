import * as Location from "expo-location";

const cache = new Map<string, string>();
const CACHE_TTL = 900_000; // 15 min
const cacheTimestamps = new Map<string, number>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getCached(lat: number, lng: number): string | null {
  const key = cacheKey(lat, lng);
  const ts = cacheTimestamps.get(key);
  if (ts && Date.now() - ts < CACHE_TTL) {
    return cache.get(key) ?? null;
  }
  return null;
}

function setCache(lat: number, lng: number, address: string) {
  const key = cacheKey(lat, lng);
  cache.set(key, address);
  cacheTimestamps.set(key, Date.now());
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const cached = getCached(lat, lng);
  if (cached) return cached;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!results?.length) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const r = results[0];
    const parts: string[] = [];

    // Build a readable address from available fields
    if (r.street && r.name) {
      // Prefer street number + name if available
      parts.push(r.name !== r.street ? `${r.name}, ${r.street}` : r.street);
    } else if (r.name) {
      parts.push(r.name);
    } else if (r.street) {
      parts.push(r.street);
    }

    if (r.city) parts.push(r.city);
    if (r.region) parts.push(r.region);
    if (r.postalCode) parts.push(r.postalCode);

    const address = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setCache(lat, lng, address);
    return address;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function clearGeocodeCache() {
  cache.clear();
  cacheTimestamps.clear();
}
