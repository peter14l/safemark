import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Tabs, usePathname, useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { registerForPushNotifications } from "../../services/notifications";
import { startLocationTracking } from "../../services/location";
import { getTrackingPreference, isOnboardingComplete } from "../../lib/securestore";
import { startTamperDetection } from "../../services/tamper";
import { flushOfflineQueue } from "../../lib/offline-queue";
import { useIncomingCall } from "../../hooks/useIncomingCall";
import { IncomingCallOverlay } from "../../components/IncomingCallOverlay";
import { seedPresetMarkers } from "../../services/markers";
import { getPartner } from "../../services/pairing";
import { supabase, isConfigured } from "../../services/supabase";
import {
  Home,
  MapPin,
  Navigation,
  AlertTriangle,
  Flag,
  Settings,
  Phone,
} from "lucide-react-native";

const TABS = [
  { name: "dashboard", label: "Home", icon: Home },
  { name: "sos", label: "SOS", icon: AlertTriangle },
  { name: "trip", label: "Trip", icon: Flag },
  { name: "call-logs", label: "Calls", icon: Phone },
  { name: "settings", label: "Settings", icon: Settings },
] as const;

function FloatingTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getActiveTab = () => {
    for (const tab of TABS) {
      if (pathname === `/(app)/${tab.name}` || pathname === `/${tab.name}`) {
        return tab.name;
      }
    }
    return "dashboard";
  };

  const active = getActiveTab();

  return (
    <View style={[tabStyles.container, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={tabStyles.inner}>
        {TABS.map((tab) => {
          const isActive = active === tab.name;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(`/(app)/${tab.name}`)}
              activeOpacity={0.7}
              style={[
                tabStyles.tab,
                isActive && tabStyles.activeTab,
              ]}
            >
              <Icon
                size={20}
                color={isActive ? "#FFFFFF" : "#555570"}
                strokeWidth={isActive ? 2 : 1.6}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    width: 52,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#6C63FF",
  },
});

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const { incomingCall, dismissIncomingCall } = useIncomingCall(user?.id);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    isOnboardingComplete().then(setOnboardingDone);
  }, []);

  // Fetch and seed presets, pair tracking
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications(user.id);
    getTrackingPreference().then((wasEnabled) => {
      if (wasEnabled) {
        startLocationTracking();
      }
    });
    startTamperDetection();
    flushOfflineQueue();

    if (user.email) {
      seedPresetMarkers(user.id, user.email).catch((err) =>
        console.error("Auto seeding preset markers failed:", err)
      );
    }

    // Attempt standard pairing first
    getPartner(user.id).then((p) => {
      if (p) {
        setPartnerId(p.id);
        setPartnerName(p.name);
      } else if (user.email && isConfigured && supabase) {
        // Fallback: direct email lookup for target users even if unpaired
        const email = user.email.toLowerCase();
        const targetEmails = ["baban012008@gmail.com", "petoorpoorkor20@gmail.com"];
        if (targetEmails.includes(email)) {
          const otherEmail = email === "baban012008@gmail.com" ? "petoorpoorkor20@gmail.com" : "baban012008@gmail.com";
          supabase.rpc("get_user_id_by_email", { p_email: otherEmail }).then(({ data: partnerUuid }) => {
            if (partnerUuid) {
              setPartnerId(partnerUuid);
              supabase.from("profiles").select("display_name").eq("id", partnerUuid).single().then(({ data: prof }) => {
                if (prof) setPartnerName(prof.display_name);
              });
            }
          });
        }
      }
    });
  }, [user]);

  // Realtime push notifications configuration and listener
  useEffect(() => {
    if (!user || !isConfigured || !supabase) return;

    // Fetch initial preference
    supabase
      .from("profiles")
      .select("push_enabled")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setPushEnabled(data.push_enabled);
      });

    // Subscribe to preference updates
    const profileChannel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && "push_enabled" in payload.new) {
            setPushEnabled(payload.new.push_enabled);
          }
        }
      )
      .subscribe();

    // Subscribe to location_feed updates
    const feedChannel = supabase
      .channel("feed-updates-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_feed",
        },
        async (payload) => {
          const newFeed = payload.new;
          if (!newFeed) return;

          const isMe = newFeed.user_id === user.id;
          const isPartner = newFeed.user_id === partnerId;

          if (!isMe && !isPartner) return;

          if (
            newFeed.event_type !== "geofence_crossing" &&
            newFeed.event_type !== "trip_arrival"
          ) {
            return;
          }

          // Check if spot crossed is one of the four preset spots
          const presetSpots = ["ruby", "college more", "biswa bangla", "xavier's", "xavier"];
          const markerName = (newFeed.marker_nickname || "").toLowerCase();
          const isPresetSpot = presetSpots.some((spot) => markerName.includes(spot));

          if (!isPresetSpot && newFeed.event_type === "geofence_crossing") return;

          // Get setting and notify accordingly
          // Local/System notifications logic: If system notifications are OFF (push_enabled = false), show in-app alert
          const profileRes = await supabase
            .from("profiles")
            .select("push_enabled")
            .eq("id", user.id)
            .single();

          const currentPushEnabled = profileRes.data?.push_enabled ?? pushEnabled;

          if (!currentPushEnabled) {
            const travelerName = isMe ? "You" : (partnerName || "Partner");
            let title = "SafeMark Alert";
            let body = "";

            if (newFeed.event_type === "geofence_crossing") {
              title = "Spot Crossed";
              body = `${travelerName} crossed ${newFeed.marker_nickname}`;
            } else if (newFeed.event_type === "trip_arrival") {
              title = "Trip Arrival";
              body = `${travelerName} arrived at ${newFeed.marker_nickname}`;
            }

            Alert.alert(title, body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(feedChannel);
    };
  }, [user, partnerId, partnerName, pushEnabled]);

  if (loading || onboardingDone === null) return null;
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={() => <FloatingTabBar />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="feed" options={{ href: null }} />
        <Tabs.Screen name="sos" />
        <Tabs.Screen name="trip" />
        <Tabs.Screen name="markers" options={{ href: null }} />
        <Tabs.Screen name="call-logs" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="emergency-contacts" options={{ href: null }} />
        <Tabs.Screen name="pairing" options={{ href: null }} />
        <Tabs.Screen name="call" options={{ href: null }} />
      </Tabs>

      {/* Incoming call overlay — renders over everything */}
      {incomingCall && (
        <IncomingCallOverlay
          call={incomingCall}
          onDismiss={dismissIncomingCall}
        />
      )}
    </View>
  );
}
