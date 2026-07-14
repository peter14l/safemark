import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase, isConfigured } from "./supabase";
import { Trip } from "./trips";

export async function exportTripData(format: "csv" | "json" = "csv"): Promise<boolean> {
  if (!isConfigured || !supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!trips?.length) return false;

  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === "csv") {
    const headers = "ID,Start Name,Start Lat,Start Lng,End Name,End Lat,End Lng,Status,Arrival Radius,Started At,Completed At\n";
    const rows = trips.map((t: Trip) =>
      `${t.id},${t.start_name},${t.start_lat},${t.start_lng},${t.end_name},${t.end_lat},${t.end_lng},${t.status},${t.arrival_radius_m},${t.started_at},${t.completed_at || ""}`
    ).join("\n");
    content = headers + rows;
    filename = `safemark-trips-${new Date().toISOString().split("T")[0]}.csv`;
    mimeType = "text/csv";
  } else {
    content = JSON.stringify(trips, null, 2);
    filename = `safemark-trips-${new Date().toISOString().split("T")[0]}.json`;
    mimeType = "application/json";
  }

  const fileUri = (FileSystem as any).cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, content);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: "Export Trip Data",
    });
  }

  return true;
}
