import { useState, useEffect } from "react";
import { getCurrentUser, signIn, signUp, signOut } from "../services/auth";
import { supabase, isConfigured } from "../services/supabase";
import type { User } from "@supabase/supabase-js";

const DEMO_USER = {
  id: "demo-user",
  email: "demo@local.dev",
} as User;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
