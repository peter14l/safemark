import { supabase, isConfigured } from "./supabase";
import { INVITE_CODE_EXPIRY_HOURS } from "../lib/constants";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createInviteCode(userId: string): Promise<string> {
  if (!isConfigured || !supabase) return generateCode();

  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITE_CODE_EXPIRY_HOURS);

  await supabase.from("invite_codes").insert({
    code,
    created_by: userId,
    expires_at: expiresAt.toISOString(),
  });

  return code;
}

export async function redeemInviteCode(
  code: string,
  userId: string
): Promise<string> {
  if (!isConfigured || !supabase) throw new Error("Supabase not configured");

  const { data: invite, error: fetchError } = await supabase
    .from("invite_codes")
    .select("id, created_by, expires_at")
    .eq("code", code.toUpperCase())
    .eq("used", false)
    .single();

  if (fetchError || !invite) throw new Error("Invalid or expired code");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Code expired");
  if (invite.created_by === userId) throw new Error("Cannot pair with yourself");

  await supabase
    .from("invite_codes")
    .update({ used: true })
    .eq("id", invite.id);

  await supabase.from("pairings").insert([
    { user_id: userId, partner_id: invite.created_by },
    { user_id: invite.created_by, partner_id: userId },
  ]);

  return invite.created_by;
}

export async function getPartner(userId: string) {
  if (!isConfigured || !supabase) return null;

  const { data } = await supabase
    .from("pairings")
    .select("partner_id, profiles!partner_id(display_name)")
    .eq("user_id", userId)
    .single();

  return data ? { id: data.partner_id, name: (data.profiles as any)?.display_name } : null;
}
