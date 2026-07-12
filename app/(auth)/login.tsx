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
import { signUp, signIn } from "../../services/auth";
import { Mail, Key, User } from "lucide-react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert("Error", "Fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      router.replace("/(app)/dashboard");
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
      <Text className="text-white text-3xl font-bold mb-2">
        {isSignUp ? "Create Account" : "Welcome Back"}
      </Text>
      <Text className="text-muted mb-8">
        {isSignUp ? "Sign up to get started" : "Sign in to continue"}
      </Text>

      {isSignUp && (
        <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-3">
          <User size={18} color="#555570" strokeWidth={1.8} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#555570"
            className="flex-1 text-white py-4 ml-3 text-base"
          />
        </View>
      )}

      <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-3">
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

      <View className="flex-row items-center bg-bg-card rounded-xl px-4 mb-6">
        <Key size={18} color="#555570" strokeWidth={1.8} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#555570"
          secureTextEntry
          className="flex-1 text-white py-4 ml-3 text-base"
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
        className="bg-accent py-4 rounded-xl items-center mb-4"
      >
        <Text className="text-white font-semibold text-base">
          {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsSignUp(!isSignUp)}
        activeOpacity={0.7}
      >
        <Text className="text-muted text-center">
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
