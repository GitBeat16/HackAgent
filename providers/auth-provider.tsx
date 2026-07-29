"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/supabase/profile";

const AUTH_PAGES = ["/login", "/auth/forgot-password"];

function AuthRedirectListener() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirected = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !AUTH_PAGES.includes(pathname)) return;

    redirected.current = false;
    const supabase = createClient();
    const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";

    async function handleSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || redirected.current) return;
      await ensureProfile(session.user);
      redirected.current = true;
      router.replace(next);
    }

    void handleSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;
      await ensureProfile(session.user);
      if (AUTH_PAGES.includes(pathname) && !redirected.current && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        redirected.current = true;
        router.replace(next);
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, searchParams]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthRedirectListener />
      {children}
    </>
  );
}
