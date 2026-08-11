const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "../.env" });

const supabaseUrl = "https://zcxawvjqbaqvwzcumbml.supabase.co";
const supabaseAnonKey = "sb_publishable_opH2a0p0BZ7YJ_AmYpIhFQ_LFvFbISF";

// Let's use service role key if we need to bypass RLS to see what is in the tables
// Since we don't have it, we use anon key first or look if we have service key in logs.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking profiles...");
  const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles, pError);

  console.log("Checking invite codes...");
  const { data: codes, error: cError } = await supabase.from("invite_codes").select("*");
  console.log("Invite Codes:", codes, cError);

  console.log("Checking pairings...");
  const { data: pairings, error: pairError } = await supabase.from("pairings").select("*");
  console.log("Pairings:", pairings, pairError);
}

check();
