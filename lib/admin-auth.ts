import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActiveAdminProfile = {
  active: boolean;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "reviewer";
  user_id: string;
};

export async function getActiveAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { profile: null, supabase, user: null };
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("active, email, full_name, role, user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single<ActiveAdminProfile>();

  return { profile: profile ?? null, supabase, user };
}

export async function requireActiveAdminProfile() {
  const result = await getActiveAdminProfile();

  if (!result.user) {
    redirect("/admin/login");
  }

  if (!result.profile) {
    redirect("/admin/login?error=inactive");
  }

  return {
    profile: result.profile,
    supabase: result.supabase,
    user: result.user,
  };
}
