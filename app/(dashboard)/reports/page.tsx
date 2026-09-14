"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Banknote,
  CreditCard,
  Users,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  status: "active" | "inactive" | "suspended";
};

type Charge = {
  id: string;
  customer_id: string;
  amount: number;
  type: "package" | "other";
  created_at: string;
};

type Payment = {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
};

type Subscription = {
  id: string;
  customer_id: string;
  package_id: string;
  started_at: string;
  expires_at: string;
  price: number;
  status: string;
  package: {
    name: string;
    type: "limited" | "unlimited";
  } | null;
};

type Package = {
  id: string;
  name: string;
  type: "limited" | "unlimited";
  price: number;
  is_active: boolean;
};

function formatMoney(amount: number) {
  return (
    new Intl.NumberFormat("ar-SY", {
      maximumFractionDigits: 0,
    }).format(amount) + " ل.س"
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export default function ReportsPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);

    const [
      { data: customerData },
      { data: chargeData },
      { data: paymentData },
      { data: subscriptionData },
      { data: packageData },
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, status"),

      supabase
        .from("charges")
        .select("id, customer_id, amount, type, created_at"),

      supabase
        .from("payments")
        .select("id, customer_id, amount, payment_date"),

      supabase
        .from("subscriptions")
        .select(`
          id,
          customer_id,
          package_id,
          started_at,
          expires_at,
          price,
          status,
          package:packages (
            name,
            type
          )
        `),

      supabase
        .from("packages")
        .select("id, name, type, price, is_active"),
    ]);

    setCustomers(customerData ?? []);
    setCharges(chargeData ?? []);
    setPayments(paymentData ?? []);
    setSubscriptions(
      (subscriptionData as unknown as Subscription[]) ?? []
    );
    setPackages(packageData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const now = new Date();

  const today = now.toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);

  const totalCharges = useMemo(
    () => charges.reduce((sum, charge) => sum + Number(charge.amount), 0),
    [charges]
  );

  const totalPayments = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments]
  );

  const outstanding = Math.max(totalCharges - totalPayments, 0);

  const monthCharges = useMemo(
    () =>
      charges
        .filter((charge) => charge.created_at.startsWith(currentMonth))
        .reduce((sum, charge) => sum + Number(charge.amount), 0),
    [charges, currentMonth]
  );

  const monthPayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.payment_date.startsWith(currentMonth))
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments, currentMonth]
  );

  const todayPayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.payment_date === today)
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments, today]
  );

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active"
  ).length;

  const suspendedCustomers = customers.filter(
    (customer) => customer.status === "suspended"
  ).length;

  const activeSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      new Date(subscription.expires_at) > now
  );

  const expiringSubscriptions = activeSubscriptions
    .filter((subscription) => {
      const expires = new Date(subscription.expires_at);
      const difference =
        expires.getTime() - now.getTime();

      const days = difference / (1000 * 60 * 60 * 24);

      return days >= 0 && days <= 7;
    })
    .sort(
      (a, b) =>
        new Date(a.expires_at).getTime() -
        new Date(b.expires_at).getTime()
    );

  const packageChargeTotal = charges
    .filter((charge) => charge.type === "package")
    .reduce((sum, charge) => sum + Number(charge.amount), 0);

  const otherChargeTotal = charges
    .filter((charge) => charge.type === "other")
    .reduce((sum, charge) => sum + Number(charge.amount), 0);

  const packageStats = useMemo(() => {
    return packages
      .map((pkg) => {
        const count = subscriptions.filter(
          (subscription) => subscription.package_id === pkg.id
        ).length;

        const revenue = subscriptions
          .filter((subscription) => subscription.package_id === pkg.id)
          .reduce(
            (sum, subscription) => sum + Number(subscription.price),
            0
          );

        return {
          ...pkg,
          count,
          revenue,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [packages, subscriptions]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[400px] items-center justify-center text-slate-400"
      >
        جاري تحميل التقارير...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/10 p-3">
            <BarChart3 className="h-6 w-6 text-cyan-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              التقارير
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              نظرة شاملة على العملاء والاشتراكات والدفعات والحسابات
            </p>
          </div>
        </div>
      </div>

      {/* Financial overview */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              إجمالي الدفعات
            </span>
            <Banknote className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatMoney(totalPayments)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              إجمالي المستحقات
            </span>
            <CreditCard className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatMoney(totalCharges)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              المتبقي على العملاء
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-amber-400">
            {formatMoney(outstanding)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              دفعات هذا الشهر
            </span>
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {formatMoney(monthPayments)}
          </p>
        </div>
      </div>

      {/* Customers + subscriptions */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-400" />
            <span className="text-sm text-slate-400">
              إجمالي العملاء
            </span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {customers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-400" />
            <span className="text-sm text-slate-400">
              العملاء النشطون
            </span>
          </div>

          <p className="mt-3 text-3xl font-bold text-cyan-400">
            {activeCustomers}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-cyan-400" />
            <span className="text-sm text-slate-400">
              الاشتراكات النشطة
            </span>
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {activeSubscriptions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-slate-400">
              اشتراكات تنتهي خلال 7 أيام
            </span>
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            {expiringSubscriptions.length}
          </p>
        </div>
      </div>

      {/* Monthly financial */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6">
          <h2 className="font-bold text-white">
            الحركة المالية الشهرية
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-400">
                  المستحقات
                </span>

                <span className="font-semibold text-white">
                  {formatMoney(monthCharges)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{
                    width: `${
                      monthCharges > 0
                        ? Math.min(
                            (monthPayments / monthCharges) * 100,
                            100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-sm text-slate-400">
                المدفوع هذا الشهر
              </span>

              <span className="font-bold text-cyan-400">
                {formatMoney(monthPayments)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                المتبقي من إجمالي الحسابات
              </span>

              <span className="font-bold text-amber-400">
                {formatMoney(outstanding)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6">
          <h2 className="font-bold text-white">
            توزيع المستحقات
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[#061625] p-4">
              <div>
                <p className="text-sm text-slate-400">
                  اشتراكات الباقات
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Charges من نوع package
                </p>
              </div>

              <span className="font-bold text-cyan-400">
                {formatMoney(packageChargeTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#061625] p-4">
              <div>
                <p className="text-sm text-slate-400">
                  مشتريات أخرى
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Charges من نوع other
                </p>
              </div>

              <span className="font-bold text-white">
                {formatMoney(otherChargeTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-cyan-400/10 p-4">
              <span className="font-medium text-slate-300">
                الإجمالي
              </span>

              <span className="font-bold text-white">
                {formatMoney(totalCharges)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31]">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h2 className="font-bold text-white">
              أداء الباقات
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              عدد الاشتراكات لكل باقة
            </p>
          </div>

          <Link
            href="/packages"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            إدارة الباقات
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-right">
            <thead>
              <tr className="border-b border-slate-800 text-sm text-slate-500">
                <th className="px-6 py-4 font-medium">
                  الباقة
                </th>
                <th className="px-6 py-4 font-medium">
                  النوع
                </th>
                <th className="px-6 py-4 font-medium">
                  السعر
                </th>
                <th className="px-6 py-4 font-medium">
                  الاشتراكات
                </th>
                <th className="px-6 py-4 font-medium">
                  قيمة الاشتراكات
                </th>
              </tr>
            </thead>

            <tbody>
              {packageStats.map((pkg) => (
                <tr
                  key={pkg.id}
                  className="border-b border-slate-800/70"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {pkg.name}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-400">
                    {pkg.type === "limited"
                      ? "محدودة"
                      : "غير محدودة"}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-300">
                    {formatMoney(Number(pkg.price))}
                  </td>

                  <td className="px-6 py-4 font-bold text-cyan-400">
                    {pkg.count}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-300">
                    {formatMoney(pkg.revenue)}
                  </td>
                </tr>
              ))}

              {packageStats.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    لا توجد بيانات للباقات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring subscriptions */}
      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31]">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />

            <div>
              <h2 className="font-bold text-white">
                الاشتراكات التي ستنتهي قريباً
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                الاشتراكات النشطة التي تنتهي خلال 7 أيام
              </p>
            </div>
          </div>
        </div>

        {expiringSubscriptions.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            لا توجد اشتراكات ستنتهي خلال 7 أيام.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-right">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">
                    العميل
                  </th>

                  <th className="px-6 py-4 font-medium">
                    الباقة
                  </th>

                  <th className="px-6 py-4 font-medium">
                    تاريخ الانتهاء
                  </th>

                  <th className="px-6 py-4 font-medium">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody>
                {expiringSubscriptions.map((subscription) => {
                  const customer = customers.find(
                    (item) =>
                      item.id === subscription.customer_id
                  );

                  return (
                    <tr
                      key={subscription.id}
                      className="border-b border-slate-800/70"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${subscription.customer_id}`}
                          className="font-medium text-white hover:text-cyan-400"
                        >
                          {customer?.full_name ??
                            "عميل غير معروف"}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-300">
                        {subscription.package?.name ?? "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-amber-400">
                        {formatDate(subscription.expires_at)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
                          ينتهي قريباً
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/customers"
          className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 transition hover:border-cyan-400/30"
        >
          <Users className="h-5 w-5 text-cyan-400" />
          <p className="mt-3 font-bold text-white">
            العملاء
          </p>
          <p className="mt-1 text-sm text-slate-500">
            عرض وإدارة العملاء
          </p>
        </Link>

        <Link
          href="/payments"
          className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 transition hover:border-cyan-400/30"
        >
          <Banknote className="h-5 w-5 text-cyan-400" />
          <p className="mt-3 font-bold text-white">
            الدفعات
          </p>
          <p className="mt-1 text-sm text-slate-500">
            عرض سجل الدفعات
          </p>
        </Link>

        <Link
          href="/packages"
          className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5 transition hover:border-cyan-400/30"
        >
          <Package className="h-5 w-5 text-cyan-400" />
          <p className="mt-3 font-bold text-white">
            الباقات
          </p>
          <p className="mt-1 text-sm text-slate-500">
            إدارة باقات الإنترنت
          </p>
        </Link>
      </div>
    </div>
  );
}