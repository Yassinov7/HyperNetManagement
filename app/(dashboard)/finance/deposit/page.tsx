import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Building2,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Account = {
  id: string;
  name: string;
  account_type: string;
  owner_user_id: string | null;
};

function formatMoney(value: number) {
  return (
    new Intl.NumberFormat("ar-SY", {
      maximumFractionDigits: 0,
    }).format(value) + " ل.س"
  );
}

export default async function DepositPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("financial_accounts")
    .select("id, name, account_type, owner_user_id")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (accountsError) {
    throw new Error("تعذر تحميل الحسابات المالية");
  }

  const visibleAccounts = (accounts ?? []) as Account[];

  async function createDeposit(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const accountId = String(formData.get("account_id") || "");
    const amountRaw = String(formData.get("amount") || "");
    const transactionDate =
      String(formData.get("transaction_date") || "") ||
      new Date().toISOString();

    const description =
      String(formData.get("description") || "").trim() ||
      "إيداع مالي";

    const reference =
      String(formData.get("reference") || "").trim() || null;

    const amount = Number(amountRaw);

    if (!accountId) {
      throw new Error("يرجى اختيار الصندوق");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("قيمة الإيداع غير صحيحة");
    }

    /*
     * نتحقق من الحساب من جديد على الخادم.
     * RLS ستمنع المسؤول من رؤية/اختيار حساب غير مسموح له.
     */
    const { data: account, error: accountError } = await supabase
      .from("financial_accounts")
      .select("id, name, account_type, owner_user_id, is_active")
      .eq("id", accountId)
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      throw new Error("الحساب المالي غير موجود أو غير متاح");
    }

    /*
     * إنشاء الحركة المالية.
     */
    const { data: transaction, error: transactionError } =
      await supabase
        .from("financial_transactions")
        .insert({
          transaction_type: "deposit",
          amount,
          transaction_date: transactionDate,
          description,
          reference,
          created_by: user.id,
        })
        .select("id")
        .single();

    if (transactionError || !transaction) {
      console.error(transactionError);
      throw new Error("فشل إنشاء الحركة المالية");
    }

    /*
     * الإيداع = دخول أموال إلى الحساب.
     */
    const { error: entryError } = await supabase
      .from("financial_transaction_entries")
      .insert({
        transaction_id: transaction.id,
        account_id: account.id,
        signed_amount: amount,
      });

    if (entryError) {
      console.error(entryError);

      /*
       * نحاول تنظيف الحركة التي أنشأناها الآن فقط.
       * الحركة لم تصبح مكتملة بدون entry.
       */
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transaction.id);

      throw new Error("فشل تسجيل مبلغ الإيداع");
    }

    redirect("/finance");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Header */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/finance"
            className="transition hover:text-cyan-300"
          >
            المالية
          </Link>

          <ArrowRight size={15} />

          <span className="text-cyan-300">إيداع</span>
        </div>

        <h1 className="text-2xl font-bold text-white md:text-3xl">
          إضافة إيداع
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          تسجيل مبلغ دخل إلى أحد الصناديق المالية.
        </p>
      </div>

      {/* Form */}
      <form
        action={createDeposit}
        className="overflow-hidden rounded-2xl border border-white/5 bg-[#071f35]"
      >
        <div className="border-b border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <ArrowDownToLine size={22} />
            </div>

            <div>
              <h2 className="font-bold text-white">
                بيانات الإيداع
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                سيتم تسجيل العملية في سجل الحركات المالية.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Account */}
          <div>
            <label
              htmlFor="account_id"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              إيداع في
            </label>

            <select
              id="account_id"
              name="account_id"
              required
              defaultValue=""
              className="w-full rounded-xl border border-white/10 bg-[#061b2e] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
            >
              <option value="" disabled>
                اختر الصندوق
              </option>

              {visibleAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {" — "}
                  {account.account_type === "company_cash"
                    ? "صندوق الشركة"
                    : "محفظة مسؤول"}
                </option>
              ))}
            </select>

            {visibleAccounts.length === 0 && (
              <p className="mt-2 text-xs text-red-300">
                لا توجد صناديق متاحة لهذا المستخدم.
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              مبلغ الإيداع
            </label>

            <div className="relative">
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                placeholder="مثال: 500000"
                className="w-full rounded-xl border border-white/10 bg-[#061b2e] px-4 py-3 pl-20 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              />

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ل.س
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="transaction_date"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              تاريخ الإيداع
            </label>

            <input
              id="transaction_date"
              name="transaction_date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-xl border border-white/10 bg-[#061b2e] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              الوصف
            </label>

            <input
              id="description"
              name="description"
              type="text"
              placeholder="مثال: رصيد افتتاحي للصندوق"
              className="w-full rounded-xl border border-white/10 bg-[#061b2e] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
            />
          </div>

          {/* Reference */}
          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              رقم المرجع
              <span className="mr-2 text-xs text-slate-600">
                اختياري
              </span>
            </label>

            <input
              id="reference"
              name="reference"
              type="text"
              placeholder="رقم سند أو مرجع داخلي"
              className="w-full rounded-xl border border-white/10 bg-[#061b2e] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
            />
          </div>

          {/* Info */}
          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
            <div className="flex gap-3">
              <Wallet
                size={19}
                className="mt-0.5 shrink-0 text-cyan-300"
              />

              <div>
                <p className="text-sm font-semibold text-cyan-200">
                  كيف سيؤثر الإيداع؟
                </p>

                <p className="mt-1 text-xs leading-6 text-slate-400">
                  سيتم إضافة المبلغ إلى رصيد الصندوق المحدد
                  وتسجيل حركة مالية دائمة في السجل.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/5 px-6 py-5 sm:flex-row sm:justify-end">
          <Link
            href="/finance"
            className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            إلغاء
          </Link>

          <button
            type="submit"
            disabled={visibleAccounts.length === 0}
            className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-[#06294A] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            تسجيل الإيداع
          </button>
        </div>
      </form>
    </div>
  );
}