import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Account = {
  id: string;
  name: string;
  account_type: "company_cash" | "staff_wallet" | "bank";
  owner_user_id: string | null;
  is_active: boolean;
  notes: string | null;
};

type BalanceRow = {
  account_id: string;
  name: string;
  account_type: string;
  balance: number | string | null;
};

type Transaction = {
  id: string;
  transaction_type: string;
  amount: number | string;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  created_at: string;
};

const transactionLabels: Record<string, string> = {
  customer_payment: "دفعة عميل",
  deposit: "إيداع",
  expense: "مصروف",
  withdrawal: "سحب",
  transfer: "تحويل",
  reversal: "عكس حركة",
  adjustment: "تسوية",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-SY", {
    maximumFractionDigits: 0,
  }).format(value) + " ل.س";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function accountIcon(type: string) {
  if (type === "company_cash") {
    return <Building2 size={23} />;
  }

  if (type === "bank") {
    return <Banknote size={23} />;
  }

  return <Wallet size={23} />;
}

function accountTypeLabel(type: string) {
  switch (type) {
    case "company_cash":
      return "صندوق الشركة";
    case "staff_wallet":
      return "محفظة مسؤول";
    case "bank":
      return "حساب بنكي";
    default:
      return "حساب مالي";
  }
}

function transactionIcon(type: string) {
  switch (type) {
    case "deposit":
      return <ArrowDownToLine size={18} />;
    case "withdrawal":
      return <ArrowUpFromLine size={18} />;
    case "transfer":
      return <ArrowLeftRight size={18} />;
    case "customer_payment":
      return <CircleDollarSign size={18} />;
    default:
      return <Banknote size={18} />;
  }
}

export default async function FinancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, role")
    .eq("id", user.id)
    .single();

  const isSuperadmin = profile?.role === "superadmin";

  /*
   * الحسابات:
   *
   * Superadmin:
   *   يرى كل الحسابات.
   *
   * المسؤول:
   *   RLS ستسمح له بمحفظته فقط.
   */
  const { data: accounts, error: accountsError } = await supabase
    .from("financial_accounts")
    .select(
      "id, name, account_type, owner_user_id, is_active, notes"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (accountsError) {
    throw new Error("تعذر تحميل الحسابات المالية");
  }

  const visibleAccounts = (accounts ?? []) as Account[];

  const accountIds = visibleAccounts.map((account) => account.id);

  /*
   * نحسب الرصيد مباشرة من entries.
   *
   * لا يوجد balance مخزن في الحساب.
   */
  let balances: BalanceRow[] = [];

  if (accountIds.length > 0) {
    const { data: entries, error: entriesError } = await supabase
      .from("financial_transaction_entries")
      .select("account_id, signed_amount")
      .in("account_id", accountIds);

    if (entriesError) {
      throw new Error("تعذر تحميل أرصدة الصناديق");
    }

    const balanceMap = new Map<string, number>();

    for (const entry of entries ?? []) {
      const current = balanceMap.get(entry.account_id) ?? 0;

      balanceMap.set(
        entry.account_id,
        current + Number(entry.signed_amount)
      );
    }

    balances = visibleAccounts.map((account) => ({
      account_id: account.id,
      name: account.name,
      account_type: account.account_type,
      balance: balanceMap.get(account.id) ?? 0,
    }));
  }

  /*
   * إجمالي الأموال الظاهرة للمستخدم.
   *
   * بالنسبة للـ Superadmin = جميع الصناديق.
   * بالنسبة للمسؤول = محفظته فقط.
   */
  const totalVisibleBalance = balances.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0
  );

  const companyAccount = balances.find(
    (account) => account.account_type === "company_cash"
  );

  const staffAccounts = balances.filter(
    (account) => account.account_type === "staff_wallet"
  );

  /*
   * آخر الحركات.
   *
   * نقرأ الحركات المرتبطة بالحسابات التي يستطيع المستخدم رؤيتها.
   */
  let recentTransactions: Transaction[] = [];

  if (accountIds.length > 0) {
    const { data: entryRows, error: transactionError } = await supabase
      .from("financial_transaction_entries")
      .select(
        `
          transaction_id,
          account_id,
          signed_amount,
          financial_transactions (
            id,
            transaction_type,
            amount,
            transaction_date,
            description,
            reference,
            created_at
          )
        `
      )
      .in("account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (transactionError) {
      throw new Error("تعذر تحميل الحركات المالية");
    }

    const seen = new Set<string>();

    for (const row of entryRows ?? []) {
      const transaction = row.financial_transactions as
        | Transaction
        | Transaction[]
        | null;

      const item = Array.isArray(transaction)
        ? transaction[0]
        : transaction;

      if (!item || seen.has(item.id)) {
        continue;
      }

      seen.add(item.id);
      recentTransactions.push(item);

      if (recentTransactions.length >= 10) {
        break;
      }
    }
  }

  return (
    <div dir="rtl" className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <Link
              href="/dashboard"
              className="transition hover:text-cyan-300"
            >
              لوحة التحكم
            </Link>

            <ChevronLeft size={15} />

            <span className="text-cyan-300">المالية</span>
          </div>

          <h1 className="text-2xl font-bold text-white md:text-3xl">
            صندوق الشركة
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            إدارة أموال الشركة والمحافظ والحركات المالية
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/finance/deposit"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-[#06294A] transition hover:bg-cyan-300"
          >
            <ArrowDownToLine size={18} />
            إيداع
          </Link>

          <Link
            href="/finance/withdraw"
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-400/15"
          >
            <ArrowUpFromLine size={18} />
            سحب
          </Link>

          <Link
            href="/finance/transfer"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/15"
          >
            <ArrowLeftRight size={18} />
            تحويل
          </Link>
        </div>
      </div>

      {/* Main total */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-[#07375d] via-[#06294A] to-[#041c34] p-6 shadow-[0_0_40px_rgba(0,217,245,0.06)]">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200/70">
              إجمالي الأموال المتاحة
            </p>

            <p className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
              {formatMoney(totalVisibleBalance)}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {isSuperadmin
                ? "يشمل صندوق الشركة وجميع محافظ المسؤولين"
                : "رصيد محفظتك الحالية"}
            </p>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 shadow-[0_0_25px_rgba(0,217,245,0.08)]">
            <Wallet size={30} />
          </div>
        </div>
      </section>

      {/* Account cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              الحسابات والصناديق
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              الحسابات المالية الحالية
            </p>
          </div>
        </div>

        {balances.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#061f37] p-10 text-center">
            <Wallet
              size={35}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="font-medium text-slate-300">
              لا توجد حسابات مالية ظاهرة
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {balances.map((account) => {
              const balance = Number(account.balance ?? 0);

              return (
                <div
                  key={account.account_id}
                  className={`group rounded-2xl border p-5 transition ${
                    account.account_type === "company_cash"
                      ? "border-cyan-400/20 bg-gradient-to-br from-[#07375d] to-[#06294A]"
                      : "border-white/5 bg-[#071f35] hover:border-cyan-400/15"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {account.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {accountTypeLabel(account.account_type)}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      {accountIcon(account.account_type)}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-slate-500">
                      الرصيد الحالي
                    </p>

                    <p
                      className={`mt-1 text-xl font-black ${
                        balance < 0
                          ? "text-red-300"
                          : "text-white"
                      }`}
                    >
                      {formatMoney(balance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Company summary */}
      {isSuperadmin && companyAccount && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-400/10 bg-[#071f35] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Building2 size={21} />
              </div>

              <div>
                <p className="font-bold text-white">
                  صندوق الشركة
                </p>

                <p className="text-xs text-slate-500">
                  الأموال الموجودة في الصندوق الرئيسي
                </p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-black text-white">
              {formatMoney(Number(companyAccount.balance))}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/10 bg-[#071f35] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Wallet size={21} />
              </div>

              <div>
                <p className="font-bold text-white">
                  محافظ المسؤولين
                </p>

                <p className="text-xs text-slate-500">
                  مجموع أرصدة المحافظ
                </p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-black text-white">
              {formatMoney(
                staffAccounts.reduce(
                  (sum, account) =>
                    sum + Number(account.balance ?? 0),
                  0
                )
              )}
            </p>
          </div>
        </section>
      )}

      {/* Recent transactions */}
      <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#071f35]">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h2 className="font-bold text-white">
              آخر الحركات المالية
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              أحدث العمليات المسجلة
            </p>
          </div>

          <Link
            href="/finance/transactions"
            className="text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            عرض جميع الحركات
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Banknote
              size={34}
              className="mx-auto mb-3 text-slate-700"
            />

            <p className="text-sm text-slate-400">
              لا توجد حركات مالية حتى الآن
            </p>

            <p className="mt-1 text-xs text-slate-600">
              يمكنك البدء بإضافة إيداع أو تحويل
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  {transactionIcon(
                    transaction.transaction_type
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {transaction.description ||
                      transactionLabels[
                        transaction.transaction_type
                      ] ||
                      "حركة مالية"}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      {transactionLabels[
                        transaction.transaction_type
                      ] || transaction.transaction_type}
                    </span>

                    <span>
                      {formatDate(transaction.transaction_date)}
                    </span>

                    {transaction.reference && (
                      <span>
                        المرجع: {transaction.reference}
                      </span>
                    )}
                  </div>
                </div>

                <p className="shrink-0 text-sm font-bold text-white">
                  {formatMoney(Number(transaction.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-white">
          العمليات المالية
        </h2>

        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/finance/deposit"
            className="rounded-2xl border border-white/5 bg-[#071f35] p-5 transition hover:border-cyan-400/20 hover:bg-[#08263f]"
          >
            <ArrowDownToLine className="mb-3 text-cyan-300" size={23} />

            <p className="font-bold text-white">
              إيداع
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              إضافة أموال إلى صندوق أو محفظة.
            </p>
          </Link>

          <Link
            href="/finance/withdraw"
            className="rounded-2xl border border-white/5 bg-[#071f35] p-5 transition hover:border-red-400/20 hover:bg-[#08263f]"
          >
            <ArrowUpFromLine className="mb-3 text-red-300" size={23} />

            <p className="font-bold text-white">
              سحب
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              تسجيل مبلغ خارج من أحد الصناديق.
            </p>
          </Link>

          <Link
            href="/finance/transfer"
            className="rounded-2xl border border-white/5 bg-[#071f35] p-5 transition hover:border-cyan-400/20 hover:bg-[#08263f]"
          >
            <ArrowLeftRight className="mb-3 text-cyan-300" size={23} />

            <p className="font-bold text-white">
              تحويل داخلي
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              نقل مبلغ بين صندوقين دون تغيير إجمالي أموال الشركة.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}