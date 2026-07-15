import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { Calculator } from "../components/Calculator";
import { PinInput } from "../components/PinInput";
import { hasPin, verifyPin } from "../lib/securestore";
import { hasDecoyPin, verifyDecoyPin } from "../lib/decoy-pin";
import { getCurrentUser } from "../services/auth";
import { SHAKE_THRESHOLD, SHAKE_COUNT } from "../lib/constants";
import { checkPinLockout, recordFailedAttempt, recordSuccess, formatLockoutTime, LOCKOUT_DURATION_MS } from "../lib/pin-lockout";
import { setSessionPin } from "../services/session-pin";

export default function CalculatorScreen() {
  const [showPin, setShowPin] = useState(false);
  const [showDecoyScreen, setShowDecoyScreen] = useState(false);
  const router = useRouter();
  const touchCountRef = useRef(0);
  const cooldownRef = useRef(false);

  // Shake detection for panic gesture
  const shakeCountRef = useRef(0);
  const lastShakeRef = useRef(0);

  useEffect(() => {
    const sub = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const total = Math.sqrt(x * x + y * y + z * z);

      if (total > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current > 300) {
          lastShakeRef.current = now;
          shakeCountRef.current++;

          if (shakeCountRef.current >= SHAKE_COUNT) {
            shakeCountRef.current = 0;
            setShowDecoyScreen(false);
            setShowPin(false);
            router.replace("/calculator");
          }
        }
      }
    });

    Accelerometer.setUpdateInterval(100);
    return () => sub.remove();
  }, [router]);

  const handleTouchStart = useCallback(
    (e: { nativeEvent: { touches: unknown[] } }) => {
      if (cooldownRef.current || showDecoyScreen) return;
      const count = e.nativeEvent.touches.length;
      touchCountRef.current = Math.max(touchCountRef.current, count);

      if (count >= 3 && touchCountRef.current >= 3) {
        cooldownRef.current = true;
        touchCountRef.current = 0;
        setShowPin(true);
      }
    },
    [showDecoyScreen]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchCountRef.current === 0) return;
    touchCountRef.current = 0;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 500);
  }, []);

  const handlePinSuccess = async (pin?: string) => {
    if (pin) {
      setSessionPin(pin);
    }
    await recordSuccess();
    setShowPin(false);
    setShowDecoyScreen(false);
    const user = await getCurrentUser();
    if (user) {
      router.replace("/(app)/dashboard");
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleDecoyPinSuccess = () => {
    setShowPin(false);
    setShowDecoyScreen(true);
  };

  const verifyPinWithLockout = async (pin: string): Promise<boolean> => {
    const lockout = await checkPinLockout();
    if (!lockout.allowed) {
      Alert.alert("Too Many Attempts", `Please wait ${formatLockoutTime(lockout.remainingMs)} before trying again.`);
      return false;
    }

    // Check decoy PIN first
    const hasDecoy = await hasDecoyPin();
    if (hasDecoy && (await verifyDecoyPin(pin))) {
      await recordSuccess();
      handleDecoyPinSuccess();
      return true;
    }
    // Then check real PIN
    const hasExisting = await hasPin();
    if (!hasExisting) {
      await recordSuccess();
      setSessionPin(pin);
      return true;
    }
    const valid = await verifyPin(pin);
    if (!valid) {
      const { lockedOut, attemptsLeft } = await recordFailedAttempt();
      if (lockedOut) {
        Alert.alert("Too Many Attempts", `Please wait ${formatLockoutTime(LOCKOUT_DURATION_MS)} before trying again.`);
      } else {
        Alert.alert("Incorrect PIN", `${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`);
      }
      return false;
    }
    await recordSuccess();
    setSessionPin(pin);
    return valid;
  };

  const handleTriggerCode = async (code: string) => {
    if (/^\d{6}$/.test(code)) {
      const hasDecoy = await hasDecoyPin();
      if (hasDecoy && (await verifyDecoyPin(code))) {
        await recordSuccess();
        handleDecoyPinSuccess();
        return;
      }
      const hasReal = await hasPin();
      if (hasReal && (await verifyPin(code))) {
        await recordSuccess();
        handlePinSuccess(code);
        return;
      }
    }
  };

  if (showDecoyScreen) {
    return (
      <View
        className="flex-1 bg-bg items-center justify-center px-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Text className="text-muted text-4xl font-light">0</Text>
        <Text className="text-muted/40 text-sm mt-4">Calculator</Text>
      </View>
    );
  }

  if (showPin) {
    return (
      <PinInput
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPin(false)}
        verify={verifyPinWithLockout}
      />
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Calculator showHistory onTriggerCode={handleTriggerCode} />
    </View>
  );
}

