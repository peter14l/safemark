import { useState, useEffect } from "react";
import * as Location from "expo-location";

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let active = true;

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setLoading(false);
        return;
      }

      if (!active) return;

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
      }

      if (!active) return;

      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10 },
          (loc) => {
            if (active) setLocation(loc);
          }
        );
      } catch (err: any) {
        console.error("watchPositionAsync error:", err);
      }
    }

    startWatching();

    return () => {
      active = false;
      if (sub) {
        sub.remove();
      }
    };
  }, []);

  return { location, error, loading };
}

