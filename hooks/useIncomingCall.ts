/**
 * hooks/useIncomingCall.ts
 *
 * Subscribes to the `calls` table for rows where callee_id = currentUser.id
 * and status = 'ringing'. Fires a callback so the app can show the
 * incoming-call overlay from anywhere (mounted in the root layout).
 */
import { useEffect, useRef, useState } from "react";
import { supabase, isConfigured } from "../services/supabase";
import type { CallRecord } from "../services/calling";

export function useIncomingCall(userId: string | undefined) {
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId || !isConfigured || !supabase) return;

    // Subscribe to INSERT events on the calls table where we are the callee
    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as CallRecord;
          if (row.status !== "ringing") return;

          // Fetch caller display_name
          const { data: callerProfile } = await supabase!
            .from("profiles")
            .select("display_name")
            .eq("id", row.caller_id)
            .single();

          setIncomingCall({
            ...row,
            caller: callerProfile ?? undefined,
          });
        }
      )
      // If caller cancels / call ends while we're ringing, clear overlay
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as CallRecord;
          if (
            row.status === "ended" ||
            row.status === "missed" ||
            row.status === "declined"
          ) {
            setIncomingCall((prev) =>
              prev?.id === row.id ? null : prev
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [userId]);

  const dismissIncomingCall = () => setIncomingCall(null);

  return { incomingCall, dismissIncomingCall };
}
