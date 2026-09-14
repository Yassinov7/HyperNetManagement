import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="min-h-screen bg-[#031B30] flex items-center justify-center px-4"
        >
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-8 shadow-2xl">
              <div className="h-8 w-32 animate-pulse rounded bg-slate-700" />

              <div className="mt-6 space-y-4">
                <div className="h-12 animate-pulse rounded-xl bg-[#031B30]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#031B30]" />
                <div className="h-12 animate-pulse rounded-xl bg-slate-700" />
              </div>
            </div>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}