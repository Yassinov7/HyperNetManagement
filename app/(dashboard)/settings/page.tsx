import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  KeyRound,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, is_active, created_at")
    .eq("id", user.id)
    .single();

  async function updateProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const fullName = String(formData.get("full_name") || "").trim();
    const username = String(formData.get("username") || "").trim();

    if (!fullName) {
      throw new Error("اسم المسؤول مطلوب");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username || null,
      })
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    redirect("/settings");
  }

  async function updatePassword(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const password = String(formData.get("password") || "");
    const confirmPassword = String(
      formData.get("confirm_password") || ""
    );

    if (password.length < 6) {
      throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    if (password !== confirmPassword) {
      throw new Error("كلمتا المرور غير متطابقتين");
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    redirect("/settings");
  }

  async function logout() {
    "use server";

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى لوحة التحكم
          </Link>

          <h1 className="text-2xl font-bold text-white">
            الإعدادات
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            إدارة حساب المسؤول وإعدادات النظام
          </p>
        </div>

        <div className="hidden rounded-2xl border border-cyan-400/10 bg-[#071d31] p-3 sm:block">
          <Settings className="h-6 w-6 text-cyan-400" />
        </div>
      </div>

      {/* Profile */}
      <section className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-[#071d31] shadow-xl">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <UserRound className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-bold text-white">
                الملف الشخصي
              </h2>
              <p className="text-sm text-slate-400">
                تعديل بيانات المسؤول الحالي
              </p>
            </div>
          </div>
        </div>

        <form action={updateProfile} className="space-y-5 p-6">
          <div>
            <label
              htmlFor="full_name"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              الاسم الكامل
            </label>

            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={profile?.full_name ?? ""}
              required
              placeholder="مثال: مدير الشبكة"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              اسم المستخدم
            </label>

            <input
              id="username"
              name="username"
              type="text"
              defaultValue={profile?.username ?? ""}
              placeholder="مثال: admin"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              البريد الإلكتروني
            </label>

            <input
              type="email"
              value={user.email ?? ""}
              disabled
              dir="ltr"
              className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-[#061625]/70 px-4 py-3 text-slate-500 outline-none"
            />

            <p className="mt-2 text-xs text-slate-500">
              يتم إدارة البريد الإلكتروني من نظام المصادقة.
            </p>
          </div>

          <div className="flex justify-start border-t border-slate-800 pt-5">
            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              حفظ البيانات
            </button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-[#071d31] shadow-xl">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <KeyRound className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-bold text-white">
                تغيير كلمة المرور
              </h2>

              <p className="text-sm text-slate-400">
                تحديث كلمة مرور حسابك
              </p>
            </div>
          </div>
        </div>

        <form action={updatePassword} className="space-y-5 p-6">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              كلمة المرور الجديدة
            </label>

            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              تأكيد كلمة المرور
            </label>

            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={6}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div className="flex justify-start border-t border-slate-800 pt-5">
            <button
              type="submit"
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20"
            >
              تحديث كلمة المرور
            </button>
          </div>
        </form>
      </section>

      {/* Account information */}
      <section className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/10 p-3">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>

          <div>
            <h2 className="font-bold text-white">
              معلومات الحساب
            </h2>

            <p className="text-sm text-slate-400">
              معلومات النظام والصلاحيات
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-[#061625] p-4">
            <p className="text-xs text-slate-500">
              الصلاحية
            </p>

            <p className="mt-2 font-semibold text-white">
              مسؤول النظام
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#061625] p-4">
            <p className="text-xs text-slate-500">
              حالة الحساب
            </p>

            <p
              className={`mt-2 font-semibold ${
                profile?.is_active
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {profile?.is_active ? "نشط" : "غير نشط"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#061625] p-4">
            <p className="text-xs text-slate-500">
              البريد الإلكتروني
            </p>

            <p
              className="mt-2 truncate font-medium text-slate-300"
              dir="ltr"
            >
              {user.email ?? "-"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#061625] p-4">
            <p className="text-xs text-slate-500">
              تاريخ إنشاء الحساب
            </p>

            <p className="mt-2 font-medium text-slate-300">
              {profile?.created_at
                ? new Intl.DateTimeFormat("ar-SY", {
                    dateStyle: "medium",
                  }).format(new Date(profile.created_at))
                : "-"}
            </p>
          </div>
        </div>
      </section>

      {/* System */}
      <section className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6 shadow-xl">
        <h2 className="font-bold text-white">
          معلومات HyperNet
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">النظام</p>
            <p className="mt-1 font-medium text-slate-300">
              HyperNet Management
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">الإصدار</p>
            <p className="mt-1 font-medium text-slate-300">
              Version 1.0
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">نوع الحساب</p>
            <p className="mt-1 font-medium text-slate-300">
              Administrator
            </p>
          </div>
        </div>
      </section>

      {/* Logout */}
      <section className="rounded-2xl border border-red-500/10 bg-[#071d31] p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-white">
              تسجيل الخروج
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              إنهاء جلسة تسجيل الدخول الحالية
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}