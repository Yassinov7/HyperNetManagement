"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#031B30] text-white">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-[#06294A] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              حدث خطأ في HyperNet
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              تعذر تحميل التطبيق بشكل صحيح.
              حاول إعادة تحميل التطبيق.
            </p>

            <button
              type="button"
              onClick={() => reset()}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D9F5] px-5 py-3 text-sm font-bold text-[#031B30] transition hover:bg-[#12E8F5]"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}