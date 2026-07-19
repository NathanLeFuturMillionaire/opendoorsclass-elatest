import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side session hook. Do NOT use in loaders (they are isomorphic).
 * Returns { session, user, loading }. Session is null while unauthenticated
 * or during initial load; check `loading` to distinguish "not yet fetched"
 * from "no session".
 */
export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/**
 * Handle full sign-out. Cancels in-flight queries, clears cache, then navigates.
 */
export async function signOutAndRedirect(navigate: (opts: { to: string; replace?: boolean }) => void) {
  await supabase.auth.signOut();
  navigate({ to: "/", replace: true });
}