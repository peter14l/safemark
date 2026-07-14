import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "DMSans-Regular": require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
    "DMSans-Medium": require("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf"),
    "DMSans-SemiBold": require("@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf"),
    "DMSans-Bold": require("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0A0A0F" },
          animation: "fade",
        }}
      />
    </>
  );
}
