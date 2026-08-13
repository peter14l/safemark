import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { reverseGeocode } from "../../lib/geocoding";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "../../hooks/useLocation";
import {
  createTrip,
  getActiveTrip,
  cancelTrip,
  getTripHistory,
  Trip,
} from "../../services/trips";
import { startLocationTracking, isTracking } from "../../services/location";
import { TRIP_ARRIVAL_DEFAULT_RADIUS, TRIP_RADIUS_OPTIONS } from "../../lib/constants";
import { Flag, MapPin, Navigation, X, CircleDot, Clock, CheckCircle, History } from "lucide-react-native";

function getTimeElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just started";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTripDuration(started: string, completed: string): string {
  const diff = new Date(completed).getTime() - new Date(started).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1m";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const PRESET_COORDINATES: Record<string, { lat: number; lng: number; address: string }> = {
  "ruby": { lat: 22.5134, lng: 88.4026, address: "Ruby Crossing, EM Bypass, Kasba, Kolkata" },
  "college more": { lat: 22.5735, lng: 88.4331, address: "College More Crossing, Sector V, Salt Lake, Kolkata" },
  "biswa bangla": { lat: 22.5791, lng: 88.4611, address: "Biswa Bangla Gate, Major Arterial Road, Newtown, Kolkata" },
  "xavier": { lat: 22.5976, lng: 88.4984, address: "St. Xavier's University Kolkata, Action Area III, Newtown, Kolkata" },
};

function resolvePresetCoordinates(name: string): { lat: number; lng: number; address: string } | null {
  const norm = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(PRESET_COORDINATES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return val;
    }
  }
  return null;
}

export default function TripScreen() {
  const { user } = useAuth();
  const { location } = useLocation();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [radius, setRadius] = useState(TRIP_ARRIVAL_DEFAULT_RADIUS);
  const [useCurrentLocation] = useState(true);
  const [startTime, setStartTime] = useState("");

  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
  const [selectedStartCoords, setSelectedStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEndCoords, setSelectedEndCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadActiveTrip = async () => {
    const trip = await getActiveTrip();
    setActiveTrip(trip);
    if (trip) {
      setStartTime(getTimeElapsed(trip.started_at));
    }
    const history = await getTripHistory(user?.id || "");
    setTripHistory(history);
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      loadActiveTrip().then(() => setLoading(false));
    });
    const interval = setInterval(() => {
      if (activeTrip) {
        setStartTime(getTimeElapsed(activeTrip.started_at));
      }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id]);

  // Load current location address on mount
  useEffect(() => {
    if (location && !startName && !selectedStartCoords) {
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setSelectedStartCoords({ lat, lng });
      reverseGeocode(lat, lng).then((addr) => {
        setStartName(addr);
      }).catch(() => {
        setStartName("Current Location");
      });
    }
  }, [location]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTrip();
    setRefreshing(false);
  };

  const fetchSuggestions = async (query: string, type: "start" | "end") => {
    if (query.trim().length < 3) {
      if (type === "start") setStartSuggestions([]);
      else setEndSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      const items = data.features.map((f: any) => {
        const name = f.properties.name || "";
        const city = f.properties.city || "";
        const state = f.properties.state || "";
        const country = f.properties.country || "";
        const fullAddress = [name, city, state, country].filter(Boolean).join(", ");
        return {
          label: fullAddress,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        };
      });
      if (type === "start") setStartSuggestions(items);
      else setEndSuggestions(items);
    } catch (e) {
      console.error("[Autocomplete error]", e);
    }
  };

  const handleStartNameChange = (text: string) => {
    setStartName(text);
    setSelectedStartCoords(null);
    fetchSuggestions(text, "start");
  };

  const handleEndNameChange = (text: string) => {
    setEndName(text);
    setSelectedEndCoords(null);
    fetchSuggestions(text, "end");
  };

  const handleCreateTrip = async () => {
    if (!endName.trim()) {
      Alert.alert("Missing destination", "Enter a destination name");
      return;
    }

    setCreating(true);
    try {
      const trackingActive = await isTracking();
      if (!trackingActive) {
        await startLocationTracking();
      }

      // 1. Resolve Start Coordinates
      let startLat = 0;
      let startLng = 0;
      let resolvedStartName = startName.trim();

      if (selectedStartCoords) {
        startLat = selectedStartCoords.lat;
        startLng = selectedStartCoords.lng;
      } else {
        const presetStart = resolvePresetCoordinates(resolvedStartName);
        if (presetStart) {
          startLat = presetStart.lat;
          startLng = presetStart.lng;
          resolvedStartName = presetStart.address;
        } else {
          try {
            const geocodedStart = await Location.geocodeAsync(resolvedStartName);
            if (geocodedStart.length > 0) {
              startLat = geocodedStart[0].latitude;
              startLng = geocodedStart[0].longitude;
              try {
                resolvedStartName = await reverseGeocode(startLat, startLng);
              } catch {}
            } else {
              Alert.alert("Error", `Could not find start location: "${resolvedStartName}"`);
              setCreating(false);
              return;
            }
          } catch (e) {
            Alert.alert("Error", `Failed to resolve start location: "${resolvedStartName}"`);
            setCreating(false);
            return;
          }
        }
      }

      // 2. Resolve End Coordinates
      let endLat = 0;
      let endLng = 0;
      let resolvedEndName = endName.trim();

      if (selectedEndCoords) {
        endLat = selectedEndCoords.lat;
        endLng = selectedEndCoords.lng;
      } else {
        const presetEnd = resolvePresetCoordinates(resolvedEndName);
        if (presetEnd) {
          endLat = presetEnd.lat;
          endLng = presetEnd.lng;
          resolvedEndName = presetEnd.address;
        } else {
          try {
            const geocodedEnd = await Location.geocodeAsync(resolvedEndName);
            if (geocodedEnd.length > 0) {
              endLat = geocodedEnd[0].latitude;
              endLng = geocodedEnd[0].longitude;
              try {
                resolvedEndName = await reverseGeocode(endLat, endLng);
              } catch {}
            } else {
              Alert.alert("Error", `Could not find destination: "${resolvedEndName}"`);
              setCreating(false);
              return;
            }
          } catch (e) {
            Alert.alert("Error", `Failed to resolve destination: "${resolvedEndName}"`);
            setCreating(false);
            return;
          }
        }
      }

      const trip = await createTrip(
        startLat,
        startLng,
        resolvedStartName,
        endLat,
        endLng,
        resolvedEndName,
        radius
      );

      if (trip) {
        setActiveTrip(trip);
        setStartName("");
        setEndName("");
        setSelectedStartCoords(null);
        setSelectedEndCoords(null);
        Alert.alert("Trip started", `Tracking to ${trip.end_name}`);
      }
    } catch (dbErr: any) {
      Alert.alert("Database Error", dbErr.message || "Could not create trip. Verify your Supabase policies.");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          await cancelTrip(activeTrip.id);
          setActiveTrip(null);
          loadActiveTrip();
        },
      },
    ]);
  };

  const renderSuggestions = (suggestions: any[], type: "start" | "end") => {
    if (suggestions.length === 0) return null;
    return (
      <View className="absolute left-0 right-0 top-full bg-bg-card border border-bg-elevated rounded-xl mt-1 overflow-hidden z-50 shadow-2xl">
        {suggestions.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => {
              if (type === "start") {
                setStartName(item.label);
                setSelectedStartCoords({ lat: item.lat, lng: item.lng });
                setStartSuggestions([]);
              } else {
                setEndName(item.label);
                setSelectedEndCoords({ lat: item.lat, lng: item.lng });
                setEndSuggestions([]);
              }
            }}
            activeOpacity={0.7}
            className="px-4 py-3.5 border-b border-bg-elevated/40 active:bg-bg-elevated"
          >
            <Text className="text-white text-xs font-medium" numberOfLines={2}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" style={{ paddingBottom: 90 }}>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
      >
        <Text className="text-white text-2xl font-bold mb-1">Trip</Text>
        <Text className="text-muted text-sm mb-6">
          Set start and destination points
        </Text>

        {activeTrip ? (
          <>
            {/* Active Trip Card */}
            <View className="bg-bg-card rounded-2xl p-5 mb-4 border border-accent/30">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-xl bg-accent/15 items-center justify-center">
                  <Flag size={20} color="#6C63FF" strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">
                    Active Trip
                  </Text>
                  <Text className="text-muted text-sm">{startTime}</Text>
                </View>
              </View>

              <View className="bg-bg rounded-xl p-4 gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 rounded-full bg-success/15 items-center justify-center">
                    <CircleDot size={12} color="#00C853" />
                  </View>
                  <Text className="text-white text-sm flex-1">
                    {activeTrip.start_name}
                  </Text>
                </View>

                <View className="ml-3 w-px h-4 bg-muted/30" />

                <View className="flex-row items-center gap-3">
                  <View className="w-6 h-6 rounded-full bg-danger/15 items-center justify-center">
                    <Flag size={12} color="#FF5252" />
                  </View>
                  <Text className="text-white text-sm flex-1">
                    {activeTrip.end_name}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mt-3">
                <MapPin size={12} color="#8888AA" />
                <Text className="text-muted text-xs">
                  Arrival radius: {activeTrip.arrival_radius_m}m
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleCancelTrip}
                activeOpacity={0.7}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl mt-4 bg-danger/15"
              >
                <X size={16} color="#FF5252" />
                <Text className="text-danger text-sm font-semibold">
                  Cancel Trip
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-bg-card rounded-2xl p-5">
              <Text className="text-muted text-xs leading-5">
                You&apos;ll receive a notification when you arrive at{" "}
                {activeTrip.end_name}. Your partner will also be notified.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Create Trip Form */}
            <View className="bg-bg-card rounded-2xl p-5 mb-4">
              <Text className="text-muted text-xs uppercase tracking-wider mb-3">
                Route
              </Text>

              <View className="mb-3" style={{ zIndex: 20 }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 rounded-full bg-success/15 items-center justify-center">
                    <CircleDot size={10} color="#00C853" />
                  </View>
                  <Text className="text-white text-sm font-medium">From</Text>
                </View>
                <View className="relative">
                  <TextInput
                    value={startName}
                    onChangeText={handleStartNameChange}
                    placeholder="Current Location"
                    placeholderTextColor="#555570"
                    className="bg-bg rounded-xl px-4 py-3 text-white text-sm"
                  />
                  {renderSuggestions(startSuggestions, "start")}
                </View>
              </View>

              <View className="mb-4" style={{ zIndex: 10 }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 rounded-full bg-danger/15 items-center justify-center">
                    <Flag size={10} color="#FF5252" />
                  </View>
                  <Text className="text-white text-sm font-medium">To</Text>
                </View>
                <View className="relative">
                  <TextInput
                    value={endName}
                    onChangeText={handleEndNameChange}
                    placeholder="e.g. Dance Class"
                    placeholderTextColor="#555570"
                    className="bg-bg rounded-xl px-4 py-3 text-white text-sm"
                  />
                  {renderSuggestions(endSuggestions, "end")}
                </View>
              </View>

              <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                Arrival Precision
              </Text>
              <View className="flex-row gap-2 mb-4">
                {TRIP_RADIUS_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRadius(r)}
                    activeOpacity={0.7}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
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
                    <Text
                      className={`text-xs ${
                        radius === r ? "text-white/70" : "text-muted/70"
                      }`}
                    >
                      {r === 25 ? "Exact" : r === 50 ? "Normal" : "Loose"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleCreateTrip}
                disabled={creating || !endName.trim()}
                activeOpacity={0.7}
                className={`flex-row items-center justify-center gap-2 py-3.5 rounded-xl ${
                  creating || !endName.trim() ? "bg-accent/40" : "bg-accent"
                }`}
              >
                <Navigation size={16} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold">
                  {creating ? "Starting..." : "Start Trip"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View className="bg-bg-card rounded-2xl p-5 mb-4">
              <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                How it works
              </Text>
              <View className="gap-2">
                <Text className="text-muted text-xs leading-5">
                  1. Set your destination and tap Start Trip
                </Text>
                <Text className="text-muted text-xs leading-5">
                  2. Travel normally — tracking runs in background
                </Text>
                <Text className="text-muted text-xs leading-5">
                  3. When you arrive, you and your partner get notified
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Trip History */}
        {tripHistory.length > 0 && (
          <View className="mt-4">
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              activeOpacity={0.7}
              className="flex-row items-center gap-2 mb-3"
            >
              <History size={16} color="#8888AA" />
              <Text className="text-white text-base font-semibold">
                Trip History
              </Text>
              <Text className="text-muted text-sm">({tripHistory.length})</Text>
            </TouchableOpacity>

            {showHistory &&
              tripHistory.map((trip) => (
                <View
                  key={trip.id}
                  className="bg-bg-card rounded-xl p-4 mb-2"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-8 h-8 rounded-lg items-center justify-center ${
                        trip.status === "completed"
                          ? "bg-success/15"
                          : "bg-bg-elevated"
                      }`}
                    >
                      {trip.status === "completed" ? (
                        <CheckCircle size={16} color="#00C853" />
                      ) : (
                        <Clock size={16} color="#8888AA" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-medium">
                        {trip.start_name} → {trip.end_name}
                      </Text>
                      <Text className="text-muted text-xs">
                        {formatDate(trip.started_at)}
                        {trip.completed_at &&
                          ` · ${getTripDuration(trip.started_at, trip.completed_at)}`}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        trip.status === "completed"
                          ? "bg-success/15"
                          : trip.status === "cancelled"
                          ? "bg-danger/15"
                          : "bg-bg-elevated"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          trip.status === "completed"
                            ? "text-success"
                            : trip.status === "cancelled"
                            ? "text-danger"
                            : "text-muted"
                        }`}
                      >
                        {trip.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
