import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase, isConfigured } from "../../services/supabase";
import { Mail, ArrowLeft } from "lucide-react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetRequest = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!isConfigured || !supabase) {
      Alert.alert("Error", "Supabase is not configured");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "safemark://reset-password",
      });

      if (error) throw error;

      Alert.alert(
        "Link Sent",
        "A password reset link has been sent to your email address. Please check your inbox.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg justify-center px-8"
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-16 left-6 w-10 h-10 rounded-full bg-bg-card items-center justify-center"
      >
        <ArrowLeft size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <Text className="text-white text-3xl font-bold mb-2">
        Reset Password
      </Text>
      <Text className="text-muted mb-8 text-base">
        Enter your email to receive a password recovery link
      </Text>

      <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-6">
        <Mail size={18} color="#555570" strokeWidth={1.8} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#555570"
          keyboardType="email-address"
          autoCapitalize="none"
          className="flex-1 text-white py-4 ml-3 text-base"
        />
      </View>

      <TouchableOpacity
        onPress={handleResetRequest}
        disabled={loading}
        activeOpacity={0.8}
        className="bg-accent py-4 rounded-xl items-center"
      >
        <Text className="text-white font-semibold text-base">
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
