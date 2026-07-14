import * as SecureStore from "expo-secure-store";

const SETTINGS_KEY = "safemark_settings";

export interface AppSettings {
  pushEnabled: boolean;
  speedThresholdKmh: number;
  heartbeatIntervalMin: number;
  autoDeleteDays: number;
  themeMode: "auto" | "dark" | "light";
  decoyPinEnabled: boolean;
}

const DEFAULTS: AppSettings = {
  pushEnabled: true,
  speedThresholdKmh: 120,
  heartbeatIntervalMin: 5,
  autoDeleteDays: 30,
  themeMode: "auto",
  decoyPinEnabled: false,
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function updateSettings(
  updates: Partial<AppSettings>
): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...updates };
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(merged));
}
