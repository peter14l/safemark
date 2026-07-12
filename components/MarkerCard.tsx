import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Trash2 } from "lucide-react-native";
import type { Marker } from "../services/markers";

interface MarkerCardProps {
  marker: Marker;
  onPress?: () => void;
  onDelete?: () => void;
}

export function MarkerCard({ marker, onPress, onDelete }: MarkerCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-bg-card rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 rounded-full bg-accent/15 items-center justify-center">
            <Text className="text-accent text-sm font-bold">
              {marker.nickname.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-medium" numberOfLines={1}>
              {marker.nickname}
            </Text>
            <Text className="text-muted text-sm">
              {marker.radius_meters}m radius
            </Text>
          </View>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-2"
          >
            <Trash2 size={16} color="#FF5252" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
