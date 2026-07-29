import { redirect } from "next/navigation";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/server/workspace";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let userName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Board member";
  try {
    const profile = await getProfile(user.id);
    userName = profile.display_name ?? userName;
  } catch {
    // Profile may not exist until first login upsert completes.
  }

  return <DashboardContent userName={userName} />;
}
