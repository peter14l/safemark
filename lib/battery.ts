import { Platform, Linking, Alert } from "react-native";

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Linking.openSettings();
  } catch {}
}

export function showBatteryOptimizationPrompt(): void {
  Alert.alert(
    "Keep Tracking Alive",
    "For reliable background tracking, set this app to 'Unrestricted' in Battery settings. Otherwise the system may stop tracking when the screen is off.",
    [
      { text: "Later", style: "cancel" },
      {
        text: "Open Settings",
        onPress: openBatterySettings,
      },
    ]
  );
}
