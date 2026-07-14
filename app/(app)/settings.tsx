import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Switch, ScrollView, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { deletePin } from "../../lib/securestore";
import { stopLocationTracking } from "../../services/location";
import { supabase, isConfigured } from "../../services/supabase";
import { showBatteryOptimizationPrompt } from "../../lib/battery";
import { getSettings, updateSettings, AppSettings } from "../../lib/settings";
import { hasDecoyPin, setDecoyPin, deleteDecoyPin } from "../../lib/decoy-pin";
import { exportTripData } from "../../services/export";
import { sendLocalNotification, ensureNotificationChannel } from "../../services/notifications";
import {
  Lock,
  Bell,
  BellOff,
  LogOut,
  Info,
  AlertTriangle,
  Users,
  Battery,
  Zap,
  Clock,
  Download,
  Shield,
  Eye,
  EyeOff,
  Palette,
  Send,
} from "lucide-react-native";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [decoyEnabled, setDecoyEnabled] = useState(false);
  const [showDecoyModal, setShowDecoyModal] = useState(false);
  const [decoyPinInput, setDecoyPinInput] = useState("");

  useEffect(() => {
    getSettings().then(setSettings);
    hasDecoyPin().then(setDecoyEnabled);
    if (user && isConfigured && supabase) {
      supabase
        .from("profiles")
        .select("push_enabled")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setPushEnabled(data.push_enabled);
        });
    }
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

  const handleToggleDecoy = async () => {
    if (decoyEnabled) {
      Alert.alert("Remove Decoy PIN", "Disable the fake calculator screen?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteDecoyPin();
            setDecoyEnabled(false);
          },
        },
      ]);
    } else {
      setDecoyPinInput("");
      setShowDecoyModal(true);
    }
  };

  const handleSetDecoyPin = async () => {
    if (decoyPinInput && /^\d{6}$/.test(decoyPinInput)) {
      await setDecoyPin(decoyPinInput);
      setDecoyEnabled(true);
      setShowDecoyModal(false);
      setDecoyPinInput("");
      Alert.alert("Done", "Decoy PIN is set");
    } else {
      Alert.alert("Invalid", "PIN must be 6 digits");
    }
  };

  const handleExportTrips = async (format: "csv" | "json") => {
    const success = await exportTripData(format);
    if (!success) {
      Alert.alert("No Data", "No trip data to export");
    }
  };

  const handleTestNotification = async () => {
    try {
      await ensureNotificationChannel();
      await sendLocalNotification("Test Notification", "SafeMark notifications are working.");
      Alert.alert("Sent", "Test notification sent. Check your notification shade.");
    } catch {
      Alert.alert("Error", "Failed to send test notification");
    }
  };

  const handleAutoDelete = async (days: number) => {
    Alert.alert(
      "Auto-Delete Data",
      `Delete all data older than ${days} days? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isConfigured && supabase) {
              const { error } = await supabase.rpc("purge_old_data", {
                p_days: days,
              });
              if (error) {
                Alert.alert("Error", "Failed to delete old data");
              } else {
                await updateSettings({ autoDeleteDays: days });
                setSettings((s) => (s ? { ...s, autoDeleteDays: days } : s));
                Alert.alert("Done", `Deleted data older than ${days} days`);
              }
            }
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

  if (!settings) return null;

  return (
    <SafeAreaView className="flex-1 bg-bg" style={{ paddingBottom: 90 }}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
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

          <TouchableOpacity
            onPress={handleTestNotification}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 bg-bg py-3 rounded-xl px-4 mt-3"
          >
            <Send size={18} color="#6C63FF" strokeWidth={1.8} />
            <View className="flex-1">
              <Text className="text-white text-sm font-medium">
                Send Test Notification
              </Text>
              <Text className="text-muted text-xs">
                Verify notifications are working
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Safety Features */}
        <View className="bg-bg-card rounded-2xl p-5 mb-4">
          <Text className="text-muted text-xs uppercase tracking-wider mb-3">
            Safety Features
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-bg-elevated">
            <View className="flex-row items-center gap-3 flex-1">
              <Zap size={18} color="#FF9100" strokeWidth={1.8} />
              <View>
                <Text className="text-white text-sm font-medium">Speed Alerts</Text>
                <Text className="text-muted text-xs">
                  Notify if traveling above {settings.speedThresholdKmh} km/h
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-bg-elevated">
            <View className="flex-row items-center gap-3 flex-1">
              <Clock size={18} color="#E91E63" strokeWidth={1.8} />
              <View>
                <Text className="text-white text-sm font-medium">Heartbeat</Text>
                <Text className="text-muted text-xs">
                  &quot;Still alive&quot; ping every {settings.heartbeatIntervalMin} min
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center gap-3 flex-1">
              <Shield size={18} color="#00BCD4" strokeWidth={1.8} />
              <View>
                <Text className="text-white text-sm font-medium">Tamper Detection</Text>
                <Text className="text-muted text-xs">
                  Alert partner if app is force-stopped
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stealth */}
        <View className="bg-bg-card rounded-2xl p-5 mb-4">
          <Text className="text-muted text-xs uppercase tracking-wider mb-3">
            Stealth
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-bg-elevated">
            <View className="flex-row items-center gap-3 flex-1">
              {decoyEnabled ? (
                <EyeOff size={18} color="#6C63FF" strokeWidth={1.8} />
              ) : (
                <Eye size={18} color="#555570" strokeWidth={1.8} />
              )}
              <View>
                <Text className="text-white text-sm font-medium">Decoy PIN</Text>
                <Text className="text-muted text-xs">
                  {decoyEnabled ? "Active — fake screen enabled" : "Inactive"}
                </Text>
              </View>
            </View>
            <Switch
              value={decoyEnabled}
              onValueChange={handleToggleDecoy}
              trackColor={{ false: "#252540", true: "#6C63FF40" }}
              thumbColor={decoyEnabled ? "#6C63FF" : "#555570"}
            />
          </View>

          <View className="py-3">
            <View className="flex-row items-center gap-3">
              <Palette size={18} color="#8888AA" strokeWidth={1.8} />
              <View className="flex-1">
                <Text className="text-white text-sm font-medium">Shake to Lock</Text>
                <Text className="text-muted text-xs">
                  Shake device 3× to instantly return to calculator
                </Text>
              </View>
              <View className="px-2 py-1 rounded-full bg-accent/15">
                <Text className="text-accent text-xs">Always on</Text>
              </View>
            </View>
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
                Set to &apos;Unrestricted&apos; for reliable tracking
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View className="bg-bg-card rounded-2xl p-5 mb-4">
          <Text className="text-muted text-xs uppercase tracking-wider mb-3">
            Data
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-bg-elevated">
            <View className="flex-row items-center gap-3 flex-1">
              <Download size={18} color="#6C63FF" strokeWidth={1.8} />
              <View>
                <Text className="text-white text-sm font-medium">Export Trip Data</Text>
                <Text className="text-muted text-xs">
                  Download as CSV or JSON
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2 mt-3 mb-3">
            <TouchableOpacity
              onPress={() => handleExportTrips("csv")}
              activeOpacity={0.7}
              className="flex-1 bg-bg py-3 rounded-xl items-center"
            >
              <Text className="text-accent text-sm font-medium">Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleExportTrips("json")}
              activeOpacity={0.7}
              className="flex-1 bg-bg py-3 rounded-xl items-center"
            >
              <Text className="text-accent text-sm font-medium">Export JSON</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => handleAutoDelete(settings.autoDeleteDays)}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 bg-bg py-3 rounded-xl px-4"
          >
            <AlertTriangle size={18} color="#FF5252" strokeWidth={1.8} />
            <View className="flex-1">
              <Text className="text-white text-sm font-medium">
                Auto-Delete Old Data
              </Text>
              <Text className="text-muted text-xs">
                Currently: {settings.autoDeleteDays} days
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
              <Text className="text-white text-sm">1.3.0</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted text-sm">App Name</Text>
              <Text className="text-white text-sm">Calc</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Decoy PIN Modal */}
      <Modal visible={showDecoyModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-bg-card rounded-2xl p-6 w-full">
            <Text className="text-white text-lg font-semibold mb-1">
              Set Decoy PIN
            </Text>
            <Text className="text-muted text-sm mb-4">
              Choose a 6-digit PIN that opens a fake empty calculator screen.
            </Text>
            <TextInput
              value={decoyPinInput}
              onChangeText={setDecoyPinInput}
              placeholder="000000"
              placeholderTextColor="#555570"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
              className="bg-bg rounded-xl px-4 py-4 text-white text-center text-2xl tracking-widest mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowDecoyModal(false);
                  setDecoyPinInput("");
                }}
                activeOpacity={0.7}
                className="flex-1 bg-bg py-3 rounded-xl items-center"
              >
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSetDecoyPin}
                activeOpacity={0.7}
                className="flex-1 bg-accent py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Set PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
