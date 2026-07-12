import { supabase, isConfigured } from "./supabase";

export async function signUp(email: string, password: string, displayName: string) {
  if (!isConfigured || !supabase) return { user: null };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      display_name: displayName,
    });
  }
  return data;
}

export async function signIn(email: string, password: string) {
  if (!isConfigured || !supabase) return { user: null };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!isConfigured || !supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
