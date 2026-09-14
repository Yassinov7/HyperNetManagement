"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, CreditCard, CalendarDays, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Payment = {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: "cash" | "transfer" | "other";
  reference: string | null;
  notes: string | null;
  created_at: string;
  customer: {
    full_name: string;
    username: string | null;
  } | null;
};

const methodLabels = {
  cash: "نقدي",
  transfer: "تحويل",
  other: "أخرى",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("ar-SY").format(amount) + " ل.س";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export default function PaymentsPage() {
  const supabase = createClient();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [loading, setLoading] = useState(true);

  async function loadPayments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        customer_id,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        created_at,
        customer:customers (
          full_name,
          username
        )
      `)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) {
      setPayments((data as unknown as Payment[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const customerName = payment.customer?.full_name?.toLowerCase() ?? "";
      const username = payment.customer?.username?.toLowerCase() ?? "";
      const reference = payment.reference?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        username.includes(query) ||
        reference.includes(query);

      const matchesMethod =
        method === "all" || payment.payment_method === method;

      return matchesSearch && matchesMethod;
    });
  }, [payments, search, method]);

  const totalPayments = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const today = new Date().toISOString().slice(0, 10);

  const todayPayments = payments
    .filter((payment) => payment.payment_date === today)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthPayments = payments
    .filter((payment) => payment.payment_date.startsWith(currentMonth))
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الدفعات</h1>
          <p className="mt-1 text-sm text-slate-400">
            متابعة جميع الدفعات المسجلة من العملاء
          </p>
        </div>

        <Link
          href="/customers"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          <CreditCard className="h-4 w-4" />
          تسجيل دفعة
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">إجمالي الدفعات</span>
            <Banknote className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="text-2xl font-bold text-white">
            {formatMoney(totalPayments)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">دفعات هذا الشهر</span>
            <CalendarDays className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="text-2xl font-bold text-white">
            {formatMoney(monthPayments)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">دفعات اليوم</span>
            <CreditCard className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="text-2xl font-bold text-white">
            {formatMoney(todayPayments)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل أو اسم المستخدم أو رقم المرجع..."
              className="w-full rounded-xl border border-slate-700 bg-[#061625] py-3 pl-4 pr-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">كل طرق الدفع</option>
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-[#071d31]">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            سجل الدفعات
            <span className="mr-2 text-sm font-normal text-slate-500">
              ({filteredPayments.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            جاري تحميل الدفعات...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            لا توجد دفعات مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-right">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-500">
                  <th className="px-5 py-4 font-medium">العميل</th>
                  <th className="px-5 py-4 font-medium">المبلغ</th>
                  <th className="px-5 py-4 font-medium">التاريخ</th>
                  <th className="px-5 py-4 font-medium">طريقة الدفع</th>
                  <th className="px-5 py-4 font-medium">المرجع</th>
                  <th className="px-5 py-4 font-medium">ملاحظات</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-800/70 transition hover:bg-cyan-400/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${payment.customer_id}`}
                        className="font-medium text-white hover:text-cyan-400"
                      >
                        {payment.customer?.full_name ?? "عميل غير معروف"}
                      </Link>

                      {payment.customer?.username && (
                        <p className="mt-1 text-xs text-slate-500">
                          @{payment.customer.username}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-cyan-400">
                        {formatMoney(Number(payment.amount))}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-300">
                      {formatDate(payment.payment_date)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300">
                        {methodLabels[payment.payment_method]}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-400">
                      {payment.reference || "—"}
                    </td>

                    <td className="max-w-[220px] truncate px-5 py-4 text-sm text-slate-500">
                      {payment.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}