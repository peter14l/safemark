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
import { setPin } from "../lib/securestore";
import { PIN_LENGTH } from "../lib/constants";
import { Lock } from "lucide-react-native";

export default function SetupPinScreen() {
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const router = useRouter();

  const handleComplete = async (confirmPin: string) => {
    if (pin !== confirmPin) {
      Alert.alert("PINs don't match", "Try again");
      setConfirm("");
      setStep("enter");
      setPinValue("");
      return;
    }
    await setPin(pin);
    router.replace("/(app)/dashboard");
  };

  const currentPin = step === "enter" ? pin : confirm;
  const setCurrentPin = step === "enter" ? setPinValue : setConfirm;

  const handleChange = (text: string) => {
    if (text.length > PIN_LENGTH) return;
    setCurrentPin(text);

    if (text.length === PIN_LENGTH) {
      if (step === "enter") {
        setStep("confirm");
      } else {
        handleComplete(text);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg items-center justify-center px-8"
    >
      <View className="w-14 h-14 rounded-2xl bg-accent/15 items-center justify-center mb-6">
        <Lock size={28} color="#6C63FF" strokeWidth={1.8} />
      </View>

      <Text className="text-white text-2xl font-semibold mb-2">
        Set Your PIN
      </Text>
      <Text className="text-muted text-center mb-8">
        {step === "enter"
          ? "Choose a 6-digit PIN to unlock the app"
          : "Confirm your PIN"}
      </Text>

      <View className="flex-row gap-3 mb-6">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`w-12 h-12 rounded-xl items-center justify-center border ${
              i < currentPin.length
                ? "border-accent bg-accent/10"
                : "border-bg-elevated"
            }`}
          >
            {i < currentPin.length && (
              <View className="w-3 h-3 rounded-full bg-white" />
            )}
          </View>
        ))}
      </View>

      <TextInput
        value={currentPin}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        autoFocus
        className="absolute opacity-0"
      />

      <TouchableOpacity
        onPress={() => {}}
        className="absolute bottom-20 w-full"
      >
        <View className="bg-bg-elevated py-4 rounded-2xl items-center">
          <Text className="text-white text-lg">Tap to enter PIN</Text>
        </View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
