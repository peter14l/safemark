import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, LinkIcon, AlertTriangle } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { redeemInviteCode, getPartner } from "../services/pairing";

/**
 * Deep-link landing screen.
 * Opened via:  safemark://pair?code=ABCDEF
 *
 * Flow:
 *  1. User not logged in  → show "You need to log in first" with a note that
 *     the code will be waiting on the Pairing screen.
 *  2. User logged in, no partner yet → auto-redeem the code.
 *  3. User already paired → just tell them and redirect to dashboard.
 */
export default function PairDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<
    "loading" | "success" | "already_paired" | "error" | "needs_login"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!code) {
      setStatus("error");
      setErrorMessage("No pairing code found in the link.");
      return;
    }

    // Not logged in — can't auto-redeem, direct them to log in first
    if (!user) {
      setStatus("needs_login");
      return;
    }

    (async () => {
      try {
        // Already paired?
        const existing = await getPartner(user.id);
        if (existing) {
          setStatus("already_paired");
          setTimeout(() => router.replace("/(app)/dashboard"), 2000);
          return;
        }

        await redeemInviteCode(code.toUpperCase(), user.id);
        setStatus("success");
        setTimeout(() => router.replace("/(app)/dashboard"), 2000);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message ?? "Failed to pair. The code may be expired or already used.");
      }
    })();
  }, [authLoading, user, code]);

  const goToLogin = () => {
    // Store the code in the URL so the pairing screen can pre-fill it
    router.replace(`/(auth)/login`);
  };

  const goToPairing = () => {
    router.replace("/(app)/pairing");
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text className="text-muted text-sm mt-4">Verifying pairing code…</Text>
      </SafeAreaView>
    );
  }

  if (status === "success") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-success/15 items-center justify-center mb-6">
          <Check size={36} color="#00C853" strokeWidth={2} />
        </View>
        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Paired Successfully!
        </Text>
        <Text className="text-muted text-sm text-center">
          You're now connected with your partner. Redirecting…
        </Text>
      </SafeAreaView>
    );
  }

  if (status === "already_paired") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-accent/15 items-center justify-center mb-6">
          <Check size={36} color="#6C63FF" strokeWidth={2} />
        </View>
        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Already Paired
        </Text>
        <Text className="text-muted text-sm text-center">
          You're already connected with a partner. Redirecting to dashboard…
        </Text>
      </SafeAreaView>
    );
  }

  if (status === "needs_login") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-accent/15 items-center justify-center mb-6">
          <LinkIcon size={36} color="#6C63FF" strokeWidth={1.8} />
        </View>
        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Log In to Pair
        </Text>
        <Text className="text-muted text-sm text-center mb-2">
          You have a pairing code:{" "}
          <Text className="text-accent font-mono font-bold">{code}</Text>
        </Text>
        <Text className="text-muted text-sm text-center mb-8">
          Log in first, then enter this code on the Pairing screen.
        </Text>

        <View className="w-full gap-3">
          <Text
            onPress={goToLogin}
            className="bg-accent text-white text-center font-semibold py-4 rounded-2xl overflow-hidden"
          >
            Go to Login
          </Text>
          <Text
            onPress={goToPairing}
            className="bg-bg-card text-muted text-center font-medium py-4 rounded-2xl overflow-hidden"
          >
            I'm already logged in → Pairing screen
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // error
  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-danger/15 items-center justify-center mb-6">
        <AlertTriangle size={36} color="#FF5252" strokeWidth={1.8} />
      </View>
      <Text className="text-white text-2xl font-bold mb-2 text-center">
        Pairing Failed
      </Text>
      <Text className="text-muted text-sm text-center mb-8">
        {errorMessage}
      </Text>
      <Text
        onPress={goToPairing}
        className="bg-bg-card text-accent text-center font-medium py-4 px-8 rounded-2xl overflow-hidden"
      >
        Try Manually
      </Text>
    </SafeAreaView>
  );
}
