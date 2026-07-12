import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useMarkers } from "../../hooks/useMarkers";
import { useLocation } from "../../hooks/useLocation";
import { isTracking, startLocationTracking, stopLocationTracking } from "../../services/location";
import { supabase, isConfigured } from "../../services/supabase";
import { getPartner } from "../../services/pairing";
import {
  Shield,
  Crosshair,
  CircleDot,
  MapPin,
  Play,
  Square,
  AlertTriangle,
  Phone,
} from "lucide-react-native";
import { isSOSActive } from "../../services/sos";
import { getEmergencyContacts, EmergencyContact } from "../../lib/contacts";

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { markers } = useMarkers(user?.id);
  const { location } = useLocation();
  const [tracking, setTracking] = useState(false);
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    isTracking().then(setTracking);
    setSosActive(isSOSActive());
    getEmergencyContacts().then(setEmergencyContacts);
    if (user) {
      getPartner(user.id).then(setPartner);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    isTracking().then(setTracking);
    setSosActive(isSOSActive());
    getEmergencyContacts().then(setEmergencyContacts);
    if (user) getPartner(user.id).then(setPartner);
    setRefreshing(false);
  };

  const toggleTracking = async () => {
    if (tracking) {
      await stopLocationTracking();
      setTracking(false);
    } else {
      const started = await startLocationTracking();
      setTracking(started);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
      >
        <Text className="text-white text-2xl font-bold mb-1">Dashboard</Text>
        <Text className="text-muted text-sm mb-6">
          Your safety overview
        </Text>

        {/* Tracking Status */}
        <View className="bg-bg-card rounded-2xl p-5 mb-4">
          <View className="flex-row items-center gap-3 mb-3">
            <View
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                tracking ? "bg-success/15" : "bg-bg-elevated"
              }`}
            >
              <Shield
                size={18}
                color={tracking ? "#00C853" : "#555570"}
                strokeWidth={1.8}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">
                Tracking
              </Text>
              <Text className="text-muted text-sm">
                {tracking ? "Running in background" : "Not active"}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${
                tracking ? "bg-success/15" : "bg-bg-elevated"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  tracking ? "text-success" : "text-muted"
                }`}
              >
                {tracking ? "Active" : "Off"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={toggleTracking}
            activeOpacity={0.7}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-xl mt-2 ${
              tracking ? "bg-danger/15" : "bg-accent"
            }`}
          >
            {tracking ? (
              <Square size={16} color="#FF5252" fill="#FF5252" />
            ) : (
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
            )}
            <Text className={`text-sm font-semibold ${tracking ? "text-danger" : "text-white"}`}>
              {tracking ? "Stop Tracking" : "Start Tracking"}
            </Text>
          </TouchableOpacity>

          {location && (
            <View className="bg-bg rounded-xl p-3 mt-2 gap-1.5">
              <View className="flex-row items-center gap-2">
                <Crosshair size={12} color="#8888AA" />
                <Text className="text-muted text-xs">
                  {location.coords.latitude.toFixed(6)},{" "}
                  {location.coords.longitude.toFixed(6)}
                </Text>
              </View>
              <Text className="text-muted text-xs">
                Accuracy: {location.coords.accuracy?.toFixed(0)}m
              </Text>
            </View>
          )}
        </View>

        {/* SOS Quick Access */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/sos")}
          activeOpacity={0.7}
          className={`rounded-2xl p-4 mb-4 ${
            sosActive ? "bg-danger/15 border border-danger/30" : "bg-bg-card"
          }`}
        >
          <View className="flex-row items-center gap-3">
            <View
              className={`w-11 h-11 rounded-xl items-center justify-center ${
                sosActive ? "bg-danger/20" : "bg-danger/10"
              }`}
            >
              <AlertTriangle
                size={22}
                color={sosActive ? "#FF1744" : "#FF5252"}
                strokeWidth={1.8}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">
                {sosActive ? "SOS ACTIVE" : "Emergency SOS"}
              </Text>
              <Text className="text-muted text-sm">
                {sosActive
                  ? "Recording and tracking in progress"
                  : `${emergencyContacts.length} contact${emergencyContacts.length !== 1 ? "s" : ""} ready`}
              </Text>
            </View>
            {sosActive && (
              <View className="w-3 h-3 rounded-full bg-danger animate-pulse" />
            )}
          </View>
        </TouchableOpacity>

        {/* Partner Status */}
        {partner && (
          <View className="bg-bg-card rounded-2xl p-5 mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-accent/15 items-center justify-center">
                <CircleDot size={18} color="#6C63FF" strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold">
                  {partner.name}
                </Text>
                <Text className="text-muted text-sm">
                  Your safety partner
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Markers Summary */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-base font-semibold">
              Active Markers
            </Text>
            <Text className="text-accent text-sm">{markers.length}</Text>
          </View>

          {markers.length === 0 ? (
            <View className="bg-bg-card rounded-2xl p-8 items-center">
              <View className="w-12 h-12 rounded-2xl bg-bg-elevated items-center justify-center mb-3">
                <MapPin size={24} color="#555570" strokeWidth={1.5} />
              </View>
              <Text className="text-muted text-center text-sm leading-5">
                No markers yet.{"\n"}Add checkpoints when you travel.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {markers.slice(0, 3).map((m) => (
                <View
                  key={m.id}
                  className="bg-bg-card rounded-xl px-4 py-3 flex-row items-center gap-3"
                >
                  <View className="w-8 h-8 rounded-lg bg-accent/15 items-center justify-center">
                    <Text className="text-accent text-xs font-bold">
                      {m.nickname.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium">
                      {m.nickname}
                    </Text>
                    <Text className="text-muted text-xs">
                      {m.radius_meters}m radius
                    </Text>
                  </View>
                </View>
              ))}
              {markers.length > 3 && (
                <Text className="text-muted text-xs text-center mt-1">
                  +{markers.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


