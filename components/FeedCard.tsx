import React from "react";
import { View, Text } from "react-native";
import { MapPin, Navigation, Clock } from "lucide-react-native";

export interface FeedItem {
  id: string;
  event_type: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  marker_nickname: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "geofence_crossing":
      return <MapPin size={14} color="#00C853" />;
    case "journey_start":
      return <Navigation size={14} color="#6C63FF" />;
    case "journey_end":
      return <Navigation size={14} color="#FF5252" />;
    default:
      return <Clock size={14} color="#8888AA" />;
  }
}

function EventLabel({ item }: { item: FeedItem }) {
  switch (item.event_type) {
    case "geofence_crossing":
      return (
        <Text className="text-white text-sm">
          Crossed{" "}
          <Text className="font-semibold">{item.marker_nickname}</Text>
        </Text>
      );
    case "journey_start":
      return <Text className="text-white text-sm">Started journey</Text>;
    case "journey_end":
      return <Text className="text-white text-sm">Ended journey</Text>;
    default:
      return <Text className="text-white text-sm">Location update</Text>;
  }
}

export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <View className="bg-bg-card rounded-xl p-4 mb-2 flex-row items-start gap-3">
      <View className="w-8 h-8 rounded-full bg-bg-elevated items-center justify-center mt-0.5">
        <EventIcon type={item.event_type} />
      </View>
      <View className="flex-1">
        <EventLabel item={item} />
        <View className="flex-row items-center gap-2 mt-1">
          <Text className="text-muted text-xs">
            {timeAgo(item.created_at)}
          </Text>
          {item.accuracy != null && (
            <>
              <Text className="text-muted text-xs">·</Text>
              <Text className="text-muted text-xs">
                ±{item.accuracy.toFixed(0)}m
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
