import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { setPin, completeOnboarding } from "../lib/securestore";
import {
  Calculator,
  Shield,
  Eye,
  EyeOff,
  Users,
  ChevronRight,
  ChevronLeft,
  Fingerprint,
  Check,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to Calc",
    subtitle: "This app looks like a simple calculator. Only you know it's something more.",
    icon: <Calculator size={48} color="#FFFFFF" />,
    color: "#6C63FF",
  },
  {
    title: "Hidden in Plain Sight",
    subtitle: "Three-finger touch reveals the PIN screen. Enter your PIN to access the real app. No one will ever know.",
    icon: <Eye size={48} color="#FFFFFF" />,
    color: "#6C63FF",
  },
  {
    title: "Stay Connected",
    subtitle: "Pair with your safety partner. Share live location, set checkpoints, and get notified when they arrive safely.",
    icon: <Users size={48} color="#FFFFFF" />,
    color: "#6C63FF",
  },
  {
    title: "Your Safety Net",
    subtitle: "SOS alerts, trip tracking, geofence check-ins, and more — all running silently in the background.",
    icon: <Shield size={48} color="#FFFFFF" />,
    color: "#6C63FF",
  },
  {
    title: "Set Your PIN",
    subtitle: "Choose a 6-digit PIN that only you know. This is the key to your hidden world.",
    icon: <Fingerprint size={48} color="#FFFFFF" />,
    color: "#6C63FF",
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const isPinStep = currentStep === STEPS.length - 1;
  const canProceed = isPinStep ? pin.length === 6 && pin === confirmPin : true;

  const goNext = async () => {
    if (isPinStep) {
      if (pin.length !== 6) {
        setPinError("PIN must be 6 digits");
        return;
      }
      if (pin !== confirmPin) {
        setPinError("PINs don't match");
        return;
      }

      setSaving(true);
      try {
        await setPin(pin);
        await completeOnboarding();
        router.replace("/(auth)/login");
      } catch (err: any) {
        setPinError(err.message || "Failed to set PIN");
      } finally {
        setSaving(false);
      }
      return;
    }

    const next = currentStep + 1;
    setCurrentStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const goBack = () => {
    if (currentStep === 0) return;
    const prev = currentStep - 1;
    setCurrentStep(prev);
    scrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
  };

  const skip = async () => {
    await completeOnboarding();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={{ width: SCREEN_WIDTH * STEPS.length }}
      >
        {STEPS.map((step, index) => (
          <View
            key={index}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-8"
          >
            <View
              className="w-24 h-24 rounded-3xl items-center justify-center mb-8"
              style={{ backgroundColor: step.color + "20" }}
            >
              {step.icon}
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-3">
              {step.title}
            </Text>
            <Text className="text-muted text-center text-sm leading-6 mb-8">
              {step.subtitle}
            </Text>

            {/* PIN inputs on last step */}
            {isPinStep && (
              <View className="w-full">
                <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                  Enter PIN
                </Text>
                <View className="relative mb-4">
                  <TextInput
                    value={pin}
                    onChangeText={(t) => {
                      setPinValue(t.replace(/[^0-9]/g, "").slice(0, 6));
                      setPinError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry={!showPin}
                    placeholder="------"
                    placeholderTextColor="#555570"
                    className="bg-bg-card rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[8px]"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPin(!showPin)}
                    className="absolute right-3 top-4"
                  >
                    {showPin ? (
                      <EyeOff size={18} color="#555570" />
                    ) : (
                      <Eye size={18} color="#555570" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                  Confirm PIN
                </Text>
                <View className="relative mb-3">
                  <TextInput
                    value={confirmPin}
                    onChangeText={(t) => {
                      setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 6));
                      setPinError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry={!showConfirmPin}
                    placeholder="------"
                    placeholderTextColor="#555570"
                    className="bg-bg-card rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[8px]"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-4"
                  >
                    {showConfirmPin ? (
                      <EyeOff size={18} color="#555570" />
                    ) : (
                      <Eye size={18} color="#555570" />
                    )}
                  </TouchableOpacity>
                </View>

                {pinError ? (
                  <Text className="text-danger text-sm mb-2">{pinError}</Text>
                ) : null}

                <View className="flex-row gap-2 mt-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View
                      key={i}
                      className={`flex-1 h-12 rounded-xl items-center justify-center border ${
                        pinError
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
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Progress dots */}
      <View className="flex-row justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${
              i === currentStep ? "w-6 bg-accent" : "w-1.5 bg-bg-elevated"
            }`}
          />
        ))}
      </View>

      {/* Bottom buttons */}
      <View className="px-6 pb-8">
        {currentStep > 0 && (
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.7}
            className="flex-row items-center justify-center gap-2 py-3 rounded-xl mb-3 bg-bg-card"
          >
            <ChevronLeft size={18} color="#8888AA" />
            <Text className="text-muted text-sm">Back</Text>
          </TouchableOpacity>
        )}

        {!isPinStep && (
          <TouchableOpacity
            onPress={skip}
            activeOpacity={0.7}
            className="items-center py-2 mb-3"
          >
            <Text className="text-muted text-sm">Skip for now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={goNext}
          disabled={!canProceed || saving}
          activeOpacity={0.7}
          className={`flex-row items-center justify-center gap-2 py-4 rounded-xl ${
            canProceed && !saving ? "bg-accent" : "bg-accent/40"
          }`}
        >
          {isPinStep ? (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold">
                {saving ? "Setting up..." : "Complete Setup"}
              </Text>
            </>
          ) : (
            <>
              <Text className="text-white text-base font-semibold">Continue</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
