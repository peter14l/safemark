import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { supabase, isConfigured } from "../services/supabase";
import { Key, Check, AlertTriangle } from "lucide-react-native";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const handleRedirect = async () => {
      try {
        // Parse Hash parameters from URL (e.g. safemark://reset-password#access_token=xxx&...)
        const hashIndex = url.indexOf("#");
        if (hashIndex === -1) {
          const parsed = Linking.parse(url);
          // Fallback to queryParams if not in hash
          const accessToken = parsed.queryParams?.access_token as string;
          const refreshToken = parsed.queryParams?.refresh_token as string;
          
          if (accessToken && refreshToken) {
            const { error } = await supabase!.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            setSessionValid(true);
            return;
          }
          
          setSessionValid(false);
          setErrorMessage("Invalid reset link layout.");
          return;
        }

        const hash = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
          setSessionValid(false);
          setErrorMessage("Reset tokens are missing from the link.");
          return;
        }

        const { error } = await supabase!.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;
        setSessionValid(true);
      } catch (err: any) {
        setSessionValid(false);
        setErrorMessage(err.message ?? "Could not establish reset session.");
      }
    };

    handleRedirect();
  }, [url]);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase!.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert(
        "Success",
        "Your password has been successfully reset. Please log in with your new password.",
        [{ text: "Log In", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionValid === null) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text className="text-muted text-sm mt-4">Establishing recovery session…</Text>
      </SafeAreaView>
    );
  }

  if (sessionValid === false) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-danger/15 items-center justify-center mb-6">
          <AlertTriangle size={36} color="#FF5252" strokeWidth={1.8} />
        </View>
        <Text className="text-white text-2xl font-bold mb-2 text-center">
          Invalid Reset Link
        </Text>
        <Text className="text-muted text-sm text-center mb-8">
          {errorMessage || "The reset link is expired or invalid."}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="bg-bg-card py-4 px-8 rounded-2xl"
        >
          <Text className="text-accent text-sm font-semibold">Back to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg justify-center px-8"
    >
      <Text className="text-white text-3xl font-bold mb-2">
        New Password
      </Text>
      <Text className="text-muted mb-8 text-base">
        Enter your new account password below
      </Text>

      <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-3">
        <Key size={18} color="#555570" strokeWidth={1.8} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="New Password"
          placeholderTextColor="#555570"
          secureTextEntry
          className="flex-1 text-white py-4 ml-3 text-base"
        />
      </View>

      <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-6">
        <Key size={18} color="#555570" strokeWidth={1.8} />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm New Password"
          placeholderTextColor="#555570"
          secureTextEntry
          className="flex-1 text-white py-4 ml-3 text-base"
        />
      </View>

      <TouchableOpacity
        onPress={handleUpdatePassword}
        disabled={loading}
        activeOpacity={0.8}
        className="bg-accent py-4 rounded-xl items-center"
      >
        <Text className="text-white font-semibold text-base">
          {loading ? "Updating..." : "Update Password"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
