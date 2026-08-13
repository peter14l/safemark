import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith("http");

const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error("[Supabase Storage] Error reading key:", key, e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error("[Supabase Storage] Error writing key:", key, e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("[Supabase Storage] Error removing key:", key, e);
    }
  },
};

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
