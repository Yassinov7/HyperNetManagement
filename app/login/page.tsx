"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#031B30] flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-4xl font-bold text-white">
            <span className="text-[#12E8F5]">Hyper</span>Net
          </div>

          <p className="mt-2 text-slate-400">
            نظام إدارة العملاء والحسابات
          </p>
        </div>

        <div className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-8 shadow-2xl">
          <h1 className="mb-6 text-2xl font-bold text-white">
            تسجيل الدخول
          </h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                البريد الإلكتروني
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] px-4 py-3 text-white outline-none transition focus:border-[#12E8F5]"
                placeholder="admin@hypernet.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                كلمة المرور
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] px-4 py-3 text-white outline-none transition focus:border-[#12E8F5]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00D9F5] px-4 py-3 font-bold text-[#031B30] transition hover:bg-[#12E8F5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}