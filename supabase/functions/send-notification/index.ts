import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the JWT and get the real user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user_id = user.id;
    const { marker_id, marker_nickname } = await req.json();

    let partnerPushToken = "";
    let partnerPushEnabled = true;

    // Direct lookup for target emails
    const senderEmail = user.email?.toLowerCase();
    const targetEmails = ["baban012008@gmail.com", "petoorpoorkor20@gmail.com"];

    if (targetEmails.includes(senderEmail)) {
      const otherEmail = senderEmail === "baban012008@gmail.com" ? "petoorpoorkor20@gmail.com" : "baban012008@gmail.com";
      
      const { data: userData } = await supabase.auth.admin.listUsers();
      const otherUser = userData?.users?.find((u: any) => u.email?.toLowerCase() === otherEmail);
      if (otherUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("push_token, push_enabled")
          .eq("id", otherUser.id)
          .single();
        
        if (profile?.push_token) {
          partnerPushToken = profile.push_token;
          partnerPushEnabled = profile.push_enabled;
        }
      }
    }

    // Fallback to pairings if not resolved or not target users
    if (!partnerPushToken) {
      const { data: pairing } = await supabase
        .from("pairings")
        .select("partner_id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (pairing) {
        const { data: partner } = await supabase
          .from("profiles")
          .select("push_token, push_enabled")
          .eq("id", pairing.partner_id)
          .single();

        if (partner?.push_token) {
          partnerPushToken = partner.push_token;
          partnerPushEnabled = partner.push_enabled;
        }
      }
    }

    if (!partnerPushToken) {
      return new Response(
        JSON.stringify({ error: "Partner push token not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notification via Expo
    const message = {
      to: partner.push_token,
      title: "Safe Check-In",
      body: `She safely crossed ${marker_nickname}`,
      data: { marker_id, marker_nickname, type: "geofence_crossing" },
      sound: true,
      priority: "high",
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
