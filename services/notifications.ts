import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase, isConfigured } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = "safemark";

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const existing = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    if (!existing) {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Safety Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C63FF",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
    }
  } catch (e) {
    console.log("[Notif] ensureNotificationChannel error:", e);
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("[Notif] Not a physical device, skipping push registration");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log("[Notif] Existing permission status:", finalStatus);

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[Notif] Requested permission status:", finalStatus);
    }

    if (finalStatus !== "granted") {
      console.log("[Notif] Notifications permission not granted");
      return null;
    }

    await ensureNotificationChannel();

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    console.log("[Notif] Push token obtained:", pushToken.substring(0, 30) + "...");

    if (isConfigured && supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({ push_token: pushToken })
        .eq("id", userId);
      if (error) {
        console.log("[Notif] Failed to save push token to Supabase:", error.message);
      } else {
        console.log("[Notif] Push token saved to Supabase");
      }
    }

    return pushToken;
  } catch (e) {
    console.log("[Notif] registerForPushNotifications error:", e);
    return null;
  }
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  try {
    await ensureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: null,
    });
    console.log("[Notif] Local notification sent:", title);
  } catch (e) {
    console.log("[Notif] sendLocalNotification error:", e);
  }
}
