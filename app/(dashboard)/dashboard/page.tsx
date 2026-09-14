import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Cpu,
  Package,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SY").format(value) + " ل.س";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SY").format(value);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: customersCount },
    { count: activeCustomersCount },
    { count: suspendedCustomersCount },
    { count: cpesCount },
    { count: activeSubscriptionsCount },
    { data: charges },
    { data: payments },
    { data: recentPayments },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended"),

    supabase
      .from("cpes")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    supabase
      .from("charges")
      .select("amount"),

    supabase
      .from("payments")
      .select("amount"),

    supabase
      .from("payments")
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        reference,
        customers (
          id,
          full_name,
          username
        )
      `)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const totalCharges =
    charges?.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    ) ?? 0;

  const totalPayments =
    payments?.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    ) ?? 0;

  const outstanding = Math.max(
    totalCharges - totalPayments,
    0
  );

  const stats = [
    {
      title: "إجمالي العملاء",
      value: formatNumber(customersCount ?? 0),
      description: `${formatNumber(activeCustomersCount ?? 0)} عميل نشط`,
      icon: Users,
      href: "/customers",
    },
    {
      title: "أجهزة CPE",
      value: formatNumber(cpesCount ?? 0),
      description: "إجمالي الأجهزة",
      icon: Cpu,
      href: "/cpes",
    },
    {
      title: "الاشتراكات النشطة",
      value: formatNumber(activeSubscriptionsCount ?? 0),
      description: "اشتراكات فعالة حالياً",
      icon: Package,
      href: "/packages",
    },
    {
      title: "إجمالي الدفعات",
      value: formatCurrency(totalPayments),
      description: "إجمالي المبالغ المسجلة",
      icon: CreditCard,
      href: "/payments",
    },
  ];

  const paymentMethodLabel: Record<string, string> = {
    cash: "نقدي",
    transfer: "تحويل",
    other: "أخرى",
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-cyan-400">
            مرحباً بك في HyperNet
          </p>

          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            لوحة التحكم
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            نظرة عامة على العملاء والاشتراكات والحسابات المالية.
          </p>
        </div>

        <Link
          href="/customers"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          <UserPlus className="h-4 w-4" />
          إضافة عميل
        </Link>
      </div>

      {/* Main stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link
              key={stat.title}
              href={stat.href}
              className="group rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 shadow-xl transition hover:-translate-y-0.5 hover:border-cyan-400/25"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-cyan-400/10 p-3">
                  <Icon className="h-5 w-5 text-cyan-400" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-400" />
              </div>

              <p className="mt-5 text-sm text-slate-400">
                {stat.title}
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {stat.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Financial overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <Wallet className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                إجمالي المستحقات
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {formatCurrency(totalCharges)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/10 bg-[#071d31] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-400/10 p-3">
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                إجمالي المدفوع
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-400">
                {formatCurrency(totalPayments)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/10 bg-[#071d31] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/10 p-3">
              <Wallet className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                المتبقي
              </p>

              <p className="mt-1 text-xl font-bold text-amber-400">
                {formatCurrency(outstanding)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent payments */}
        <section className="xl:col-span-2 rounded-2xl border border-cyan-400/10 bg-[#071d31] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-bold text-white">
                آخر الدفعات
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أحدث العمليات المالية
              </p>
            </div>

            <Link
              href="/payments"
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((payment) => {
                const customer = Array.isArray(payment.customers)
                  ? payment.customers[0]
                  : payment.customers;

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {customer?.full_name || "عميل غير معروف"}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {customer?.username && (
                          <span dir="ltr">
                            @{customer.username}
                          </span>
                        )}

                        <span>
                          {paymentMethodLabel[
                            payment.payment_method
                          ] || payment.payment_method}
                        </span>

                        <span>
                          {new Intl.DateTimeFormat("ar-SY").format(
                            new Date(payment.payment_date)
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-emerald-400">
                      +{formatCurrency(Number(payment.amount))}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-slate-700" />

                <p className="mt-3 text-sm text-slate-500">
                  لا توجد دفعات مسجلة حتى الآن
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="rounded-2xl border border-cyan-400/10 bg-[#071d31] shadow-xl">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-bold text-white">
              إجراءات سريعة
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              الوصول السريع للعمليات الأساسية
            </p>
          </div>

          <div className="space-y-2 p-4">
            <QuickAction
              href="/customers"
              title="إدارة العملاء"
              description="إضافة وتعديل العملاء"
              icon={Users}
            />

            <QuickAction
              href="/packages"
              title="إدارة الباقات"
              description="عرض وإدارة الباقات"
              icon={Package}
            />

            <QuickAction
              href="/cpes"
              title="إدارة أجهزة CPE"
              description="متابعة أجهزة العملاء"
              icon={Cpu}
            />

            <QuickAction
              href="/payments"
              title="الدفعات"
              description="متابعة العمليات المالية"
              icon={CreditCard}
            />

            <QuickAction
              href="/reports"
              title="التقارير"
              description="الإحصائيات والتقارير"
              icon={Wallet}
            />
          </div>
        </section>
      </div>

      {/* Customer status */}
      <section className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 shadow-xl">
        <div className="mb-5">
          <h2 className="font-bold text-white">
            حالة العملاء
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            توزيع العملاء حسب الحالة
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="إجمالي العملاء"
            value={customersCount ?? 0}
          />

          <StatusCard
            label="عملاء نشطون"
            value={activeCustomersCount ?? 0}
          />

          <StatusCard
            label="عملاء موقوفون"
            value={suspendedCustomersCount ?? 0}
          />
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-[#061625] p-3 transition hover:border-cyan-400/20 hover:bg-cyan-400/5"
    >
      <div className="rounded-lg bg-cyan-400/10 p-2.5">
        <Icon className="h-4 w-4 text-cyan-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 group-hover:text-white">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <ArrowLeft className="h-4 w-4 text-slate-700 transition group-hover:text-cyan-400" />
    </Link>
  );
}

function StatusCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#061625] p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}