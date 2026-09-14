import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active) {
    redirect("/login");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#031B30] p-8 text-white"
    >
      <h1 className="text-3xl font-bold">
        مرحباً، {profile.full_name}
      </h1>

      <p className="mt-2 text-slate-400">
        لوحة تحكم HyperNet
      </p>
    </main>
  );
}