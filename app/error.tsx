"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Home,
  RefreshCw,
} from "lucide-react";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("HyperNet application error:", error);
  }, [error]);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#031B30] px-4"
    >
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-red-400/20 bg-[#06294A] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-white">
            حدث خطأ غير متوقع
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            حدثت مشكلة أثناء تحميل الصفحة.
            يمكنك المحاولة مرة أخرى، وإذا استمرت المشكلة
            تواصل مع مسؤول النظام.
          </p>

          {error.digest && (
            <p className="mt-4 text-xs text-slate-600">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D9F5] px-5 py-3 text-sm font-bold text-[#031B30] transition hover:bg-[#12E8F5]"
            >
              <RefreshCw className="h-4 w-4" />
              المحاولة مرة أخرى
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}