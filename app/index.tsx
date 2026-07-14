import { Redirect } from "expo-router";
import { useState, useEffect } from "react";
import { isOnboardingComplete } from "../lib/securestore";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingComplete().then(setOnboardingDone);
  }, []);

  if (onboardingDone === null) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/calculator" />;
}
