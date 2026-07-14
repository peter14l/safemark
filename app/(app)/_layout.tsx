import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs, usePathname, useRouter, Redirect } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { registerForPushNotifications } from "../../services/notifications";
import { startLocationTracking } from "../../services/location";
import { getTrackingPreference, isOnboardingComplete } from "../../lib/securestore";
import { startTamperDetection } from "../../services/tamper";
import { flushOfflineQueue } from "../../lib/offline-queue";
import {
  Home,
  MapPin,
  Navigation,
  AlertTriangle,
  Flag,
  Settings,
} from "lucide-react-native";

const TABS = [
  { name: "dashboard", label: "Home", icon: Home },
  { name: "feed", label: "Feed", icon: Navigation },
  { name: "sos", label: "SOS", icon: AlertTriangle },
  { name: "trip", label: "Trip", icon: Flag },
  { name: "markers", label: "Markers", icon: MapPin },
  { name: "settings", label: "Settings", icon: Settings },
] as const;

function FloatingTabBar() {
  const pathname = usePathname();
  const router = useRouter();

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
    <View style={tabStyles.container}>
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
    bottom: 24,
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

  useEffect(() => {
    isOnboardingComplete().then(setOnboardingDone);
  }, []);

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
  }, [user]);

  if (loading || onboardingDone === null) return null;
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={() => <FloatingTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="sos" />
      <Tabs.Screen name="trip" />
      <Tabs.Screen name="markers" />
      <Tabs.Screen name="emergency-contacts" options={{ href: null }} />
      <Tabs.Screen name="pairing" options={{ href: null }} />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
