import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLocation } from "../../hooks/useLocation";
import {
  activateSOS,
  deactivateSOS,
  isSOSActive,
  getSOSStartTime,
} from "../../services/sos";
import {
  getEmergencyContacts,
  EmergencyContact,
} from "../../lib/contacts";
import {
  ArrowLeft,
  AlertTriangle,
  Phone,
  Mic,
  MicOff,
  MapPin,
  CircleDot,
  Shield,
  Users,
} from "lucide-react-native";

export default function SOSScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const [active, setActive] = useState(isSOSActive());
  const [elapsed, setElapsed] = useState(0);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [smsResults, setSmsResults] = useState<
    { contact: string; sent: boolean }[]
  >([]);
  const [recording, setRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getEmergencyContacts().then(setContacts);
  }, []);

  useEffect(() => {
    if (active) {
      const start = getSOSStartTime();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      Promise.resolve().then(() => {
        setElapsed(0);
      });
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setRecording(isSOSActive());
    });
  }, [active]);

  const handleActivate = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        "No Contacts",
        "Add emergency contacts before activating SOS.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Contacts",
            onPress: () => router.push("/(app)/emergency-contacts"),
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Activate SOS",
      "This will send SMS with your location to all emergency contacts and start recording audio.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await activateSOS();
              setSmsResults(result.smsResults);
              setActive(true);
              setRecording(true);
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = async () => {
    Alert.alert(
      "Deactivate SOS",
      "Stop recording and mark as resolved?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            const clips = await deactivateSOS();
            setActive(false);
            setRecording(false);
            setSmsResults([]);
            Alert.alert("Resolved", `SOS deactivated. ${clips} audio clips saved.`);
          },
        },
      ]
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const openInMaps = () => {
    if (!location) return;
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    const url = Platform.select({
      android: `google.navigation:q=${lat},${lng}`,
      ios: `maps:${lat},${lng}?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" style={{ paddingBottom: 90 }}>
      <View className="flex-row items-center gap-3 px-5 pt-4 mb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-xl bg-bg-card items-center justify-center"
        >
          <ArrowLeft size={18} color="#8888AA" strokeWidth={1.8} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">SOS</Text>
        {active && (
          <View className="flex-row items-center gap-2 bg-danger/15 px-3 py-1.5 rounded-full">
            <View className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <Text className="text-danger text-xs font-bold">
              {formatTime(elapsed)}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Location Card */}
        <TouchableOpacity
          onPress={openInMaps}
          activeOpacity={0.7}
          className="bg-bg-card rounded-2xl p-4 mb-4"
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-xl bg-accent/15 items-center justify-center">
              <MapPin size={18} color="#6C63FF" strokeWidth={1.8} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-semibold">
                Current Location
              </Text>
              <Text className="text-muted text-xs">
                Tap to open in Maps
              </Text>
            </View>
            <CircleDot size={14} color="#6C63FF" strokeWidth={1.8} />
          </View>
          {location ? (
            <View className="bg-bg rounded-xl p-3">
              <Text className="text-muted text-xs">
                {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
              {location.coords.accuracy != null && (
                <Text className="text-muted/60 text-xs mt-1">
                  Accuracy: {Math.round(location.coords.accuracy)}m
                </Text>
              )}
            </View>
          ) : (
            <View className="bg-bg rounded-xl p-3 items-center">
              <Text className="text-muted text-xs">Waiting for location...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SOS Button */}
        <View className="items-center mb-5">
          <TouchableOpacity
            onPress={active ? handleDeactivate : handleActivate}
            activeOpacity={0.8}
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "#1A1A2E" : "#FF1744",
              borderWidth: active ? 3 : 0,
              borderColor: active ? "#FF5252" : "transparent",
              shadowColor: active ? "#FF5252" : "#FF1744",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: active ? 0.3 : 0.5,
              shadowRadius: active ? 12 : 20,
              elevation: active ? 8 : 16,
            }}
          >
            {active ? (
              <View className="items-center">
                <Shield size={36} color="#FF5252" strokeWidth={1.8} />
                <Text className="text-danger text-xs font-bold mt-2">STOP</Text>
              </View>
            ) : (
              <View className="items-center">
                <AlertTriangle size={40} color="#FFFFFF" strokeWidth={2} />
                <Text className="text-white text-sm font-bold mt-1">SOS</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text className="text-muted text-xs mt-3">
            {active
              ? "Tap to deactivate and resolve"
              : "Tap to send emergency SMS"}
          </Text>
        </View>

        {/* Recording Status */}
        {active && (
          <View className="bg-bg-card rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-danger/10 items-center justify-center">
                {recording ? (
                  <Mic size={18} color="#FF5252" strokeWidth={1.8} />
                ) : (
                  <MicOff size={18} color="#555570" strokeWidth={1.8} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">
                  Audio Recording
                </Text>
                <Text className="text-muted text-xs">
                  {recording
                    ? "Recording 10-second clips"
                    : "Not recording"}
                </Text>
              </View>
              {recording && (
                <View className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
              )}
            </View>
          </View>
        )}

        {/* SMS Results */}
        {smsResults.length > 0 && (
          <View className="bg-bg-card rounded-2xl p-4 mb-4">
            <Text className="text-muted text-xs uppercase tracking-wider mb-3">
              SMS Status
            </Text>
            {smsResults.map((r, i) => (
              <View
                key={i}
                className="flex-row items-center gap-3 py-2"
              >
                <Phone size={14} color="#8888AA" strokeWidth={1.8} />
                <Text className="text-white text-sm flex-1">{r.contact}</Text>
                <View
                  className={`px-2.5 py-1 rounded-full ${
                    r.sent ? "bg-success/15" : "bg-warning/15"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      r.sent ? "text-success" : "text-warning"
                    }`}
                  >
                    {r.sent ? "Sent" : "Failed"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Emergency Contacts */}
        <View className="bg-bg-card rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-muted text-xs uppercase tracking-wider">
              Emergency Contacts
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/emergency-contacts")}
              activeOpacity={0.7}
            >
              <Text className="text-accent text-xs font-medium">
                {contacts.length === 0 ? "Add" : "Manage"}
              </Text>
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <View className="bg-bg rounded-xl p-4 items-center">
              <Users size={20} color="#555570" strokeWidth={1.5} />
              <Text className="text-muted text-xs mt-2">
                No contacts added yet
              </Text>
            </View>
          ) : (
            <View className="gap-1.5">
              {contacts.map((c) => (
                <View
                  key={c.id}
                  className="flex-row items-center gap-3 bg-bg rounded-xl px-3 py-2.5"
                >
                  <View className="w-7 h-7 rounded-lg bg-danger/10 items-center justify-center">
                    <Phone size={12} color="#FF5252" strokeWidth={1.8} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm">{c.name}</Text>
                    <Text className="text-muted text-xs">{c.phone}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
