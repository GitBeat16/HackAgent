import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Upsert profile row for any auth provider (Google, GitHub, email). */
export async function ensureProfile(user: User) {
  const supabase = createClient();
  const displayName =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split("@")[0] ??
    "Board member";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      avatar_url: user.user_metadata.avatar_url ?? null,
      email: user.email ?? null,
    },
    { onConflict: "id" },
  );
}
