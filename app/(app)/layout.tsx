import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={{ name: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Board member", avatarUrl: user.user_metadata.avatar_url }}>{children}</AppShell>;
}
