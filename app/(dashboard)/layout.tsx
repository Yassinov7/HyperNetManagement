import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Cpu,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const navigation = [
  {
    name: "لوحة التحكم",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "العملاء",
    href: "/customers",
    icon: Users,
  },
  {
    name: "الباقات",
    href: "/packages",
    icon: Package,
  },
  {
    name: "الدفعات",
    href: "/payments",
    icon: CreditCard,
  },
  {
    name: "أجهزة CPE",
    href: "/cpes",
    icon: Cpu,
  },
  {
    name: "التقارير",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "المالية",
    href: "/finance",
    icon: Wallet,
  },
  {
    name: "المسؤولون",
    href: "/admins",
    icon: ShieldCheck,
  },
  {
    name: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_inactive");
  }

  const adminName =
    profile?.full_name?.trim() ||
    user.email ||
    "مسؤول النظام";

  const adminUsername = profile?.username?.trim();

  async function logout() {
    "use server";

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect("/login");
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#041321] text-white"
    >
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-l border-cyan-400/10 bg-[#061a2b] lg:flex lg:flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-center border-b border-cyan-400/10 px-5">
            <Link
              href="/dashboard"
              className="flex items-center justify-center"
            >
              <Image
                src="/hypernet.png"
                alt="HyperNet"
                width={180}
                height={50}
                priority
                className="object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-5">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  <Icon className="h-5 w-5 shrink-0 transition group-hover:text-cyan-400" />

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar bottom */}
          <div className="border-t border-cyan-400/10 p-4">
            <div className="rounded-xl border border-cyan-400/10 bg-[#071f33] p-4">
              <p className="text-xs text-slate-500">
                HyperNet Management
              </p>

              <p className="mt-1 text-xs text-cyan-400/70">
                Version 1.0
              </p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 h-20 border-b border-cyan-400/10 bg-[#041321]/95 backdrop-blur">
            <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Mobile logo */}
              <Link
                href="/dashboard"
                className="lg:hidden"
              >
                <Image
                  src="/hypernet.png"
                  alt="HyperNet"
                  width={140}
                  height={40}
                  priority
                  className="object-contain"
                />
              </Link>

              {/* Desktop title */}
              <div className="hidden lg:block">
                <p className="text-sm text-slate-500">
                  نظام إدارة الشبكة
                </p>

                <p className="text-base font-semibold text-white">
                  HyperNet Management
                </p>
              </div>

              {/* Admin */}
              <div className="flex items-center gap-3">
                <Link
                  href="/settings"
                  className="hidden text-left sm:block"
                >
                  <p className="text-sm font-semibold text-white">
                    {adminName}
                  </p>

                  <p
                    className="text-xs text-slate-500"
                    dir="ltr"
                  >
                    {adminUsername
                      ? `@${adminUsername}`
                      : user.email}
                  </p>
                </Link>

                <Link
                  href="/settings"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 transition hover:border-cyan-400/40 hover:bg-cyan-400/20"
                  title="الإعدادات"
                >
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                </Link>

                <form action={logout}>
                  <button
                    type="submit"
                    title="تسجيل الخروج"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#071d31] text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </header>

          {/* Mobile navigation */}
          <div className="border-b border-cyan-400/10 bg-[#061a2b] lg:hidden">
            <nav className="flex gap-1 overflow-x-auto px-3 py-2">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-300"
                  >
                    <Icon className="h-4 w-4" />

                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}