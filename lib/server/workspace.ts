import { createClient } from "@/lib/supabase/server";

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(error?.message ?? "Could not load profile.");
  return data;
}

export async function updateProfile(
  userId: string,
  input: { displayName?: string; email?: string; title?: string; workspaceName?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      email: input.email,
      title: input.title,
      workspace_name: input.workspaceName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
