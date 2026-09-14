"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }

  if (normalized.includes("email not confirmed")) {
    return "يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.";
  }

  if (normalized.includes("too many requests")) {
    return "تم تجاوز عدد محاولات تسجيل الدخول. حاول مرة أخرى بعد قليل.";
  }

  if (normalized.includes("user not found")) {
    return "لم يتم العثور على هذا الحساب.";
  }

  return "تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const accountInactive =
    searchParams.get("error") === "account_inactive";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (loginError) {
      setError(translateAuthError(loginError.message));
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("تعذر إنشاء جلسة تسجيل الدخول.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#031B30] px-4"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#00D9F5]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#064D72]/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Image
              src="/hypernet.png"
              alt="HyperNet"
              width={180}
              height={50}
              priority
              className="object-contain"
            />
          </div>

          <p className="mt-3 text-sm text-slate-400">
            نظام إدارة العملاء والحسابات
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-6 shadow-2xl sm:p-8">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <ShieldCheck className="h-5 w-5 text-[#12E8F5]" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">
                  تسجيل الدخول
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  الوصول الآمن إلى نظام HyperNet
                </p>
              </div>
            </div>
          </div>

          {accountInactive && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              هذا الحساب غير نشط حاليًا. يرجى التواصل مع مسؤول النظام.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                البريد الإلكتروني
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-[#12E8F5] focus:ring-1 focus:ring-[#12E8F5]/30 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="admin@hypernet.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                كلمة المرور
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] px-4 py-3 pl-12 text-white outline-none transition placeholder:text-slate-600 focus:border-[#12E8F5] focus:ring-1 focus:ring-[#12E8F5]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00D9F5] px-4 py-3 font-bold text-[#031B30] transition hover:bg-[#12E8F5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          HyperNet Management System
        </p>
      </div>
    </main>
  );
}