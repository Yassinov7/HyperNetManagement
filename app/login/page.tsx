"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }

  if (normalized.includes("email not confirmed")) {
    return "البريد الإلكتروني للحساب غير مؤكد.";
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit")
  ) {
    return "تم تجاوز عدد محاولات تسجيل الدخول. حاول مرة أخرى بعد قليل.";
  }

  if (normalized.includes("network")) {
    return "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.";
  }

  return "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inactive =
    searchParams.get("error") === "account_inactive";

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("أدخل البريد الإلكتروني.");
      return;
    }

    if (!password) {
      setError("أدخل كلمة المرور.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      /*
       * تسجيل الدخول يتم باستخدام Supabase Auth
       * بالبريد الإلكتروني وكلمة المرور.
       */
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        setError(
          getAuthErrorMessage(loginError.message)
        );
        return;
      }

      /*
       * بعد نجاح تسجيل الدخول:
       * - نستبدل صفحة login
       * - نحدث الـ Server Components
       * - الـ proxy سيعيد التحقق من الـ session
       */
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setError(
        "حدث خطأ غير متوقع أثناء تسجيل الدخول. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#031B30] px-4 py-8"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D9F5]/5 blur-3xl" />

        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#064D72]/20 blur-3xl" />

        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#064D72]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/hypernet.png"
            alt="HyperNet"
            width={180}
            height={50}
            priority
            className="h-auto w-[180px] object-contain"
          />

          <p className="mt-4 text-sm text-slate-400">
            نظام إدارة العملاء والحسابات
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-6 shadow-2xl sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              أدخل بيانات حسابك للوصول إلى النظام
            </p>
          </div>

          {/* Inactive account */}
          {inactive && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-amber-200"
            >
              هذا الحساب غير فعال حاليًا.
              <br />
              يرجى التواصل مع مسؤول النظام.
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                البريد الإلكتروني
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={loading}
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@hypernet.com"
                  className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] py-3 pr-11 pl-4 text-white outline-none transition placeholder:text-slate-600 focus:border-[#12E8F5] focus:ring-2 focus:ring-[#12E8F5]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
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
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#0B4668] bg-[#031B30] py-3 pr-11 pl-12 text-white outline-none transition placeholder:text-slate-600 focus:border-[#12E8F5] focus:ring-2 focus:ring-[#12E8F5]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !password
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00D9F5] px-4 py-3.5 font-bold text-[#031B30] transition hover:bg-[#12E8F5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#031B30]/30 border-t-[#031B30]" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 border-t border-white/5 pt-5 text-center">
            <p className="text-xs text-slate-600">
              HyperNet Management System
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}