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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTrip();
    setRefreshing(false);
  };

  const handleCreateTrip = async () => {
    if (!endName.trim()) {
      Alert.alert("Missing destination", "Enter a destination name");
      return;
    }

    if (!location && useCurrentLocation) {
      Alert.alert(
        "No location",
        "Enable tracking or turn off 'Use current location'"
      );
      return;
    }

    setCreating(true);
    try {
      const trackingActive = await isTracking();
      if (!trackingActive) {
        await startLocationTracking();
      }

      const startLat = useCurrentLocation ? location!.coords.latitude : 0;
      const startLng = useCurrentLocation ? location!.coords.longitude : 0;

      if (!useCurrentLocation) {
        Alert.alert(
          "Start location required",
          "Use current location or enable tracking first"
        );
        setCreating(false);
        return;
      }

      const trip = await createTrip(
        startLat,
        startLng,
        useCurrentLocation ? (startName.trim() || "Current Location") : startName.trim(),
        startLat,
        startLng,
        endName.trim(),
        radius
      );

      if (trip) {
        setActiveTrip(trip);
        setStartName("");
        setEndName("");
        Alert.alert("Trip started", `Tracking to ${trip.end_name}`);
      } else {
        Alert.alert("Error", "Could not create trip");
      }
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
                  <Text className="text-muted text-xs">
                    {activeTrip.start_lat.toFixed(4)},{" "}
                    {activeTrip.start_lng.toFixed(4)}
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
                  <Text className="text-muted text-xs">
                    {activeTrip.end_lat.toFixed(4)},{" "}
                    {activeTrip.end_lng.toFixed(4)}
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

              <View className="mb-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 rounded-full bg-success/15 items-center justify-center">
                    <CircleDot size={10} color="#00C853" />
                  </View>
                  <Text className="text-white text-sm font-medium">From</Text>
                </View>
                <TextInput
                  value={startName}
                  onChangeText={setStartName}
                  placeholder="Current Location"
                  placeholderTextColor="#555570"
                  className="bg-bg rounded-xl px-4 py-3 text-white text-sm"
                />
                {useCurrentLocation && location && (
                  <Text className="text-muted text-xs mt-1 ml-7">
                    Using current location:{" "}
                    {location.coords.latitude.toFixed(4)},{" "}
                    {location.coords.longitude.toFixed(4)}
                  </Text>
                )}
              </View>

              <View className="mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 rounded-full bg-danger/15 items-center justify-center">
                    <Flag size={10} color="#FF5252" />
                  </View>
                  <Text className="text-white text-sm font-medium">To</Text>
                </View>
                <TextInput
                  value={endName}
                  onChangeText={setEndName}
                  placeholder="e.g. Dance Class"
                  placeholderTextColor="#555570"
                  className="bg-bg rounded-xl px-4 py-3 text-white text-sm"
                />
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
