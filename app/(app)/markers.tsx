import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useMarkers } from "../../hooks/useMarkers";
import { useLocation } from "../../hooks/useLocation";
import { MarkerCard } from "../../components/MarkerCard";
import { MARKER_RADII, DEFAULT_RADIUS } from "../../lib/constants";
import { Plus, Crosshair } from "lucide-react-native";

export default function MarkersScreen() {
  const { user } = useAuth();
  const { markers, add, remove } = useMarkers(user?.id);
  const { location } = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [nickname, setNickname] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);

  const handleAdd = async () => {
    if (!nickname.trim()) {
      Alert.alert("Error", "Enter a nickname");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Waiting for GPS location");
      return;
    }

    try {
      await add(
        nickname.trim(),
        location.coords.latitude,
        location.coords.longitude,
        radius
      );
      setShowAdd(false);
      setNickname("");
      setRadius(DEFAULT_RADIUS);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white text-2xl font-bold">Markers</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            activeOpacity={0.7}
            className="bg-accent px-4 py-2 rounded-xl flex-row items-center gap-2"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2} />
            <Text className="text-white text-sm font-medium">Add</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-muted text-sm mb-5">
          Checkpoints for your journey
        </Text>

        {markers.length === 0 ? (
          <View className="bg-bg-card rounded-2xl p-12 items-center mt-8">
            <View className="w-14 h-14 rounded-2xl bg-bg-elevated items-center justify-center mb-4">
              <Crosshair size={28} color="#555570" strokeWidth={1.5} />
            </View>
            <Text className="text-white text-lg font-medium mb-2">
              No markers yet
            </Text>
            <Text className="text-muted text-center text-sm leading-5">
              When you travel, add markers at each{"\n"}checkpoint you want
              tracked.
            </Text>
          </View>
        ) : (
          markers.map((marker) => (
            <MarkerCard
              key={marker.id}
              marker={marker}
              onDelete={() => {
                Alert.alert(
                  "Remove Marker",
                  `Remove "${marker.nickname}"?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => remove(marker.id),
                    },
                  ]
                );
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Add Marker Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-bg-card rounded-t-3xl px-6 pt-6 pb-10">
            <View className="w-10 h-1 bg-bg-elevated rounded-full self-center mb-6" />

            <Text className="text-white text-xl font-semibold mb-1">
              Add Marker
            </Text>
            <Text className="text-muted text-sm mb-5">
              Uses your current GPS location
            </Text>

            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="Nickname (e.g., Dance Studio)"
              placeholderTextColor="#555570"
              className="bg-bg rounded-xl px-4 py-4 text-white text-base mb-4"
            />

            <Text className="text-muted text-sm mb-3">Radius</Text>
            <View className="flex-row gap-2 mb-5">
              {MARKER_RADII.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRadius(r)}
                  activeOpacity={0.7}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    radius === r ? "bg-accent" : "bg-bg"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      radius === r ? "text-white" : "text-muted"
                    }`}
                  >
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {location && (
              <View className="bg-bg rounded-xl p-3 mb-5">
                <View className="flex-row items-center gap-2 mb-1">
                  <Crosshair size={12} color="#8888AA" />
                  <Text className="text-muted text-xs">Current Location</Text>
                </View>
                <Text className="text-white text-sm">
                  {location.coords.latitude.toFixed(6)},{" "}
                  {location.coords.longitude.toFixed(6)}
                </Text>
                <Text className="text-muted text-xs mt-1">
                  ±{location.coords.accuracy?.toFixed(0)}m accuracy
                </Text>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowAdd(false);
                  setNickname("");
                }}
                activeOpacity={0.7}
                className="flex-1 bg-bg py-4 rounded-xl items-center"
              >
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdd}
                activeOpacity={0.7}
                className="flex-1 bg-accent py-4 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Add Marker</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
