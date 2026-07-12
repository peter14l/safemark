import React, { useState, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Calculator } from "../components/Calculator";
import { PinInput } from "../components/PinInput";
import { hasPin, verifyPin } from "../lib/securestore";

export default function CalculatorScreen() {
  const [showPin, setShowPin] = useState(false);
  const router = useRouter();
  const translateY = useSharedValue(0);

  const threeFingerSwipe = Gesture.Pan()
    .onUpdate((e) => {
      if (e.numberOfPointers >= 3) {
        translateY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      if (e.numberOfPointers >= 3 && translateY.value > 80) {
        translateY.value = withSpring(0, {}, () => {
          setShowPin(true);
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const handlePinSuccess = async () => {
    setShowPin(false);
    const pinSet = await hasPin();
    if (pinSet) {
      router.replace("/(app)/dashboard");
    } else {
      router.replace("/(app)/setup-pin");
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
    <GestureDetector gesture={threeFingerSwipe}>
      <Animated.View className="flex-1">
        <Calculator />
      </Animated.View>
    </GestureDetector>
  );
}
