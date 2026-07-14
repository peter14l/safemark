import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useMarkers } from "../../hooks/useMarkers";
import { useLocation } from "../../hooks/useLocation";
import { MarkerCard } from "../../components/MarkerCard";
import { MARKER_RADII, DEFAULT_RADIUS } from "../../lib/constants";
import { Plus, Crosshair, Map, Navigation } from "lucide-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MarkersScreen() {
  const { user } = useAuth();
  const { markers, add, remove } = useMarkers(user?.id);
  const { location } = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [nickname, setNickname] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [useMapPick, setUseMapPick] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const handleAdd = async () => {
    if (!nickname.trim()) {
      Alert.alert("Error", "Enter a nickname");
      return;
    }

    const lat = selectedCoords?.lat ?? location?.coords.latitude;
    const lng = selectedCoords?.lng ?? location?.coords.longitude;

    if (!lat || !lng) {
      Alert.alert("Error", "Pick a location on the map or wait for GPS");
      return;
    }

    try {
      await add(nickname.trim(), lat, lng, radius);
      setShowAdd(false);
      setNickname("");
      setRadius(DEFAULT_RADIUS);
      setSelectedCoords(null);
      setUseMapPick(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const openAddModal = () => {
    setSelectedCoords(null);
    setUseMapPick(false);
    setManualLat("");
    setManualLng("");
    setShowAdd(true);
  };

  const useCurrentLocation = () => {
    if (!location) {
      Alert.alert("Error", "GPS not available yet");
      return;
    }
    setSelectedCoords({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
    setManualLat(location.coords.latitude.toFixed(6));
    setManualLng(location.coords.longitude.toFixed(6));
  };

  const applyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Error", "Enter valid coordinates (lat -90..90, lng -180..180)");
      return;
    }
    setSelectedCoords({ lat, lng });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white text-2xl font-bold">Markers</Text>
          <TouchableOpacity
            onPress={openAddModal}
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
          <View className="bg-bg-card rounded-t-3xl px-6 pt-6 pb-10" style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}>
            <View className="w-10 h-1 bg-bg-elevated rounded-full self-center mb-6" />

            <Text className="text-white text-xl font-semibold mb-1">
              Add Marker
            </Text>
            <Text className="text-muted text-sm mb-5">
              Tap the map or use current GPS
            </Text>

            {/* Map toggle */}
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setUseMapPick(false)}
                activeOpacity={0.7}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                  !useMapPick ? "bg-accent" : "bg-bg"
                }`}
              >
                <Crosshair size={16} color={!useMapPick ? "#FFFFFF" : "#8888AA"} />
                <Text className={`text-sm font-medium ${!useMapPick ? "text-white" : "text-muted"}`}>
                  Current GPS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUseMapPick(true)}
                activeOpacity={0.7}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                  useMapPick ? "bg-accent" : "bg-bg"
                }`}
              >
                <Map size={16} color={useMapPick ? "#FFFFFF" : "#8888AA"} />
                <Text className={`text-sm font-medium ${useMapPick ? "text-white" : "text-muted"}`}>
                  Pick on Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* Map picker */}
            {useMapPick && (
              <View className="mb-4">
                {/* Use Current Location button */}
                <TouchableOpacity
                  onPress={useCurrentLocation}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-accent/15 mb-3"
                >
                  <Navigation size={14} color="#6C63FF" />
                  <Text className="text-accent text-sm font-medium">Use Current GPS Location</Text>
                </TouchableOpacity>

                {/* Manual coordinate input */}
                <View className="flex-row gap-2 mb-2">
                  <TextInput
                    value={manualLat}
                    onChangeText={setManualLat}
                    placeholder="Latitude"
                    placeholderTextColor="#555570"
                    keyboardType="numeric"
                    className="flex-1 bg-bg rounded-xl px-4 py-3 text-white text-sm"
                  />
                  <TextInput
                    value={manualLng}
                    onChangeText={setManualLng}
                    placeholder="Longitude"
                    placeholderTextColor="#555570"
                    keyboardType="numeric"
                    className="flex-1 bg-bg rounded-xl px-4 py-3 text-white text-sm"
                  />
                </View>
                <TouchableOpacity
                  onPress={applyManualCoords}
                  activeOpacity={0.7}
                  className="py-2.5 rounded-xl bg-bg items-center mb-3"
                >
                  <Text className="text-muted text-sm">Set Coordinates</Text>
                </TouchableOpacity>

                {selectedCoords && (
                  <View className="bg-bg rounded-xl p-3">
                    <View className="flex-row items-center gap-2">
                      <Crosshair size={12} color="#8888AA" />
                      <Text className="text-accent text-sm font-medium">
                        {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

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

            {/* Current location preview (when not using map) */}
            {!useMapPick && location && (
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
                  setSelectedCoords(null);
                  setUseMapPick(false);
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
