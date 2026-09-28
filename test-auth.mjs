
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read env vars
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Creating test user...");
  const email = `test-${Date.now()}@test.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: "Password123!",
  });
  
  if (authError) { console.error("Signup failed:", authError); return; }
  
  const userId = authData.user.id;
  console.log("User created:", userId);

  console.log("Setting role to startup_founder...");
  // Wait for trigger to create profile, then update
  await new Promise(r => setTimeout(r, 2000));
  await supabase.from("profiles").update({ role: "startup_founder" }).eq("id", userId);

  const { data: sessionData } = await supabase.auth.signInWithPassword({ email, password: "Password123!" });
  const token = sessionData.session.access_token;
  const refreshToken = sessionData.session.refresh_token;

  console.log("Calling API with token...");
  const res = await fetch("http://localhost:3000/api/proposals/123/document", {
    method: "POST",
    headers: {
      "Cookie": `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token=${encodeURIComponent(JSON.stringify([token, refreshToken, null, null, null]))}`
    }
  });

  console.log("Response status:", res.status);
  const text = await res.text();
  console.log("Response body:", text);
}

test();
