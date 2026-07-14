import * as SecureStore from "expo-secure-store";
import { ColorSchemeName } from "react-native";

const THEME_KEY = "safemark_theme_mode";

export type ThemeMode = "auto" | "dark" | "light";

export async function getThemeMode(): Promise<ThemeMode> {
  const val = await SecureStore.getItemAsync(THEME_KEY);
  return (val as ThemeMode) || "auto";
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, mode);
}

export function getResolvedTheme(mode: ThemeMode): ColorSchemeName {
  if (mode === "auto") {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19 ? "light" : "dark";
  }
  return mode;
}
