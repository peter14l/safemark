import { useState, useEffect, useCallback } from "react";
import { getMarkers, createMarker, updateMarker, deleteMarker } from "../services/markers";
import type { Marker } from "../services/markers";

export function useMarkers(userId: string | undefined) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMarkers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getMarkers(userId);
      setMarkers(data);
    } catch (err) {
      console.error("Failed to load markers:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (nickname: string, lat: number, lng: number, radius?: number) => {
      if (!userId) return;
      const marker = await createMarker(userId, nickname, lat, lng, radius);
      setMarkers((prev) => [marker, ...prev]);
      return marker;
    },
    [userId]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Pick<Marker, "nickname" | "radius_meters">>) => {
      await updateMarker(id, updates);
      setMarkers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteMarker(id);
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { markers, loading, refresh, add, update, remove };
}
