import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [NOINDEX] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});