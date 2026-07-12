import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { PIN_LENGTH } from "../lib/constants";

interface PinInputProps {
  onSuccess: () => void;
  onCancel: () => void;
  verify: (pin: string) => Promise<boolean>;
}

export function PinInput({ onSuccess, onCancel, verify }: PinInputProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = async (text: string) => {
    if (text.length > PIN_LENGTH) return;
    setPin(text);
    setError(false);

    if (text.length === PIN_LENGTH) {
      setLoading(true);
      const ok = await verify(text);
      setLoading(false);
      if (ok) {
        onSuccess();
      } else {
        setError(true);
        setPin("");
        inputs.current[0]?.focus();
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg items-center justify-center px-8"
    >
      <Text className="text-muted text-base mb-8">Enter PIN</Text>

      <View className="flex-row gap-3 mb-8">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`w-12 h-12 rounded-xl items-center justify-center border ${
              error
                ? "border-danger"
                : i < pin.length
                ? "border-accent bg-accent/10"
                : "border-bg-elevated"
            }`}
          >
            {i < pin.length && (
              <View className="w-3 h-3 rounded-full bg-white" />
            )}
          </View>
        ))}
      </View>

      <TextInput
        value={pin}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        autoFocus
        className="absolute opacity-0"
        ref={(el) => { inputs.current[0] = el; }}
      />

      {error && (
        <Text className="text-danger text-sm mb-4">Wrong PIN</Text>
      )}

      {loading && (
        <Text className="text-muted text-sm mb-4">Verifying...</Text>
      )}

      <TouchableOpacity onPress={onCancel} className="mt-4" activeOpacity={0.7}>
        <Text className="text-muted text-sm">Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => inputs.current[0]?.focus()}
        className="absolute bottom-20 w-full"
      >
        <View className="bg-bg-elevated py-4 rounded-2xl items-center">
          <Text className="text-white text-lg">Tap to enter PIN</Text>
        </View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
