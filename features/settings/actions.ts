"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, displayName:display_name, departmentName:department_name, startupName:startup_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) throw new Error("Could not load profile");
  return profile;
}

export async function updateProfile(input: { displayName?: string; departmentName?: string; startupName?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updates: Record<string, any> = {};
  if (input.displayName !== undefined) updates.display_name = input.displayName;
  if (input.departmentName !== undefined) updates.department_name = input.departmentName;
  if (input.startupName !== undefined) updates.startup_name = input.startupName;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
