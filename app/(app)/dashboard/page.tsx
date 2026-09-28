import { redirect } from "next/navigation";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { getCurrentUser } from "@/lib/supabase/server";


export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let userName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "User";
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    if (profile?.display_name) userName = profile.display_name;
  } catch {
    // Profile may not exist until first login upsert completes.
  }

  return <DashboardContent userName={userName} />;
}
