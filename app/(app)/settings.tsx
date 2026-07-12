import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { deletePin } from "../../lib/securestore";
import { stopLocationTracking } from "../../services/location";
import { supabase, isConfigured } from "../../services/supabase";
import {
  Lock,
  Bell,
  BellOff,
  LogOut,
  Info,
  AlertTriangle,
  Users,
  Battery,
} from "lucide-react-native";
import { showBatteryOptimizationPrompt } from "../../lib/battery";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!user || !isConfigured || !supabase) return;
    supabase
      .from("profiles")
      .select("push_enabled")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setPushEnabled(data.push_enabled);
      });
  }, [user]);

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    if (user && isConfigured && supabase) {
      await supabase
        .from("profiles")
        .update({ push_enabled: val })
        .eq("id", user.id);
    }
  };

  const handleResetPin = async () => {
    Alert.alert(
      "Reset PIN",
      "This will remove your PIN. You'll need to set a new one next time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await deletePin();
            Alert.alert("Done", "PIN has been removed");
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await stopLocationTracking();
          await signOut();
          router.replace("/calculator");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5 pt-4" style={{ paddingBottom: 90 }}>
      <Text className="text-white text-2xl font-bold mb-1">Settings</Text>
      <Text className="text-muted text-sm mb-6">
        Account and preferences
      </Text>

      {/* Account */}
      <View className="bg-bg-card rounded-2xl p-5 mb-4">
        <Text className="text-muted text-xs uppercase tracking-wider mb-3">
          Account
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-muted text-sm">Email</Text>
          <Text className="text-white text-sm">{user?.email}</Text>
        </View>
      </View>

      {/* Notifications */}
      <View className="bg-bg-card rounded-2xl p-5 mb-4">
        <Text className="text-muted text-xs uppercase tracking-wider mb-3">
          Notifications
        </Text>

        <View className="flex-row items-center justify-between py-2">
          <View className="flex-row items-center gap-3 flex-1">
            {pushEnabled ? (
              <Bell size={18} color="#6C63FF" strokeWidth={1.8} />
            ) : (
              <BellOff size={18} color="#555570" strokeWidth={1.8} />
            )}
            <View>
              <Text className="text-white text-sm font-medium">
                Push Notifications
              </Text>
              <Text className="text-muted text-xs">
                {pushEnabled
                  ? "Receiving partner check-ins"
                  : "Muted — check Feed for updates"}
              </Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={togglePush}
            trackColor={{ false: "#252540", true: "#6C63FF40" }}
            thumbColor={pushEnabled ? "#6C63FF" : "#555570"}
          />
        </View>
      </View>

      {/* Background Tracking */}
      <View className="bg-bg-card rounded-2xl p-5 mb-4">
        <Text className="text-muted text-xs uppercase tracking-wider mb-3">
          Background Tracking
        </Text>

        <TouchableOpacity
          onPress={showBatteryOptimizationPrompt}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 bg-bg py-3 rounded-xl px-4"
        >
          <Battery size={18} color="#FFB300" strokeWidth={1.8} />
          <View className="flex-1">
            <Text className="text-white text-sm font-medium">
              Battery Settings
            </Text>
            <Text className="text-muted text-xs">
              Set to 'Unrestricted' for reliable tracking
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Security */}
      <View className="bg-bg-card rounded-2xl p-5 mb-4">
        <Text className="text-muted text-xs uppercase tracking-wider mb-3">
          Security
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(app)/emergency-contacts")}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 bg-bg py-3 rounded-xl px-4 mb-3"
        >
          <Users size={18} color="#FF5252" strokeWidth={1.8} />
          <Text className="text-white text-sm flex-1">Emergency Contacts</Text>
          <Text className="text-muted text-xs">Manage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResetPin}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 bg-bg py-3 rounded-xl px-4 mb-3"
        >
          <Lock size={18} color="#8888AA" strokeWidth={1.8} />
          <Text className="text-white text-sm">Reset PIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 bg-danger/10 py-3 rounded-xl px-4"
        >
          <LogOut size={18} color="#FF5252" strokeWidth={1.8} />
          <Text className="text-danger text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View className="bg-bg-card rounded-2xl p-5">
        <View className="flex-row items-center gap-2 mb-3">
          <Info size={14} color="#555570" strokeWidth={1.8} />
          <Text className="text-muted text-xs uppercase tracking-wider">
            About
          </Text>
        </View>
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-muted text-sm">Version</Text>
            <Text className="text-white text-sm">1.0.0</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted text-sm">App Name</Text>
            <Text className="text-white text-sm">Calc</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
