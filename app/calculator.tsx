import React, { useState, useRef, useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Calculator } from "../components/Calculator";
import { PinInput } from "../components/PinInput";
import { hasPin, verifyPin } from "../lib/securestore";
import { getCurrentUser } from "../services/auth";

export default function CalculatorScreen() {
  const [showPin, setShowPin] = useState(false);
  const router = useRouter();
  const touchCountRef = useRef(0);
  const cooldownRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: { nativeEvent: { touches: Array<unknown> } }) => {
      if (cooldownRef.current) return;
      const count = e.nativeEvent.touches.length;
      touchCountRef.current = Math.max(touchCountRef.current, count);

      if (count >= 3 && touchCountRef.current >= 3) {
        cooldownRef.current = true;
        touchCountRef.current = 0;
        setShowPin(true);
      }
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    if (touchCountRef.current === 0) return;
    touchCountRef.current = 0;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 500);
  }, []);

  const handlePinSuccess = async () => {
    setShowPin(false);
    const user = await getCurrentUser();
    if (user) {
      router.replace("/(app)/dashboard");
    } else {
      router.replace("/(auth)/login");
    }
  };

  if (showPin) {
    return (
      <PinInput
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPin(false)}
        verify={async (pin) => {
          const hasExisting = await hasPin();
          if (!hasExisting) return true;
          return verifyPin(pin);
        }}
      />
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Calculator />
    </View>
  );
}
