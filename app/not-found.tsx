import Link from "next/link";
import {
  ArrowRight,
  Home,
  SearchX,
} from "lucide-react";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#031B30] px-4"
    >
      <div className="w-full max-w-lg text-center">
        <div className="rounded-3xl border border-cyan-400/10 bg-[#06294A] p-8 shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-400/10">
            <SearchX className="h-10 w-10 text-cyan-400" />
          </div>

          <p className="mt-6 text-6xl font-black text-cyan-400">
            404
          </p>

          <h1 className="mt-4 text-2xl font-bold text-white">
            الصفحة غير موجودة
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#031B30] transition hover:bg-cyan-300"
            >
              <Home className="h-4 w-4" />
              لوحة التحكم
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowRight className="h-4 w-4" />
              الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}