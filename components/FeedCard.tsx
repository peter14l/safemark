import React from "react";
import { View, Text } from "react-native";
import {
  MapPin,
  Navigation,
  Clock,
  Flag,
  Zap,
  Wifi,
  Shield,
  Heart,
} from "lucide-react-native";

export interface FeedItem {
  id: string;
  event_type: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  marker_nickname: string | null;
  address: string | null;
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
    case "trip_arrival":
      return <Flag size={14} color="#FFB300" />;
    case "journey_start":
      return <Navigation size={14} color="#6C63FF" />;
    case "journey_end":
      return <Navigation size={14} color="#FF5252" />;
    case "speed_alert":
      return <Zap size={14} color="#FF9100" />;
    case "network_change":
      return <Wifi size={14} color="#00BCD4" />;
    case "tamper_detected":
      return <Shield size={14} color="#FF1744" />;
    case "heartbeat":
      return <Heart size={14} color="#E91E63" />;
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
    case "trip_arrival":
      return (
        <Text className="text-white text-sm">
          Arrived at{" "}
          <Text className="font-semibold">{item.marker_nickname}</Text>
        </Text>
      );
    case "journey_start":
      return <Text className="text-white text-sm">Started journey</Text>;
    case "journey_end":
      return <Text className="text-white text-sm">Ended journey</Text>;
    case "speed_alert":
      return (
        <Text className="text-white text-sm">
          Speed alert:{" "}
          <Text className="font-semibold">{item.marker_nickname}</Text>
        </Text>
      );
    case "network_change":
      return (
        <Text className="text-white text-sm">
          {item.marker_nickname || "Network changed"}
        </Text>
      );
    case "tamper_detected":
      return (
        <Text className="text-white text-sm">
          <Text className="font-semibold text-danger">
            {item.marker_nickname || "Tamper detected"}
          </Text>
        </Text>
      );
    case "heartbeat":
      return <Text className="text-white text-sm">Still alive ping</Text>;
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
        {item.address && (
          <Text className="text-muted text-xs mt-1" numberOfLines={1}>
            {item.address}
          </Text>
        )}
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
