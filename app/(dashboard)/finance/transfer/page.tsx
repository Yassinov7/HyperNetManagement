import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowLeftRight,
  Wallet,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type Account = {
  id: string;
  name: string;
  account_type: "company_cash" | "staff_wallet" | "bank";
  owner_user_id: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type Entry = {
  account_id: string;
  signed_amount: number | string;
};

export default async function TransferPage({ searchParams }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  // التحويل من صندوق الشركة إلى صناديق المسؤولين
  // متاح فقط للـ Superadmin
  if (!profile || profile.role !== "superadmin") {
    redirect("/finance");
  }

  const [{ data: accounts }, { data: entries }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("financial_accounts")
        .select("id, name, account_type, owner_user_id")
        .eq("is_active", true)
        .order("account_type")
        .order("name"),

      supabase
        .from("financial_transaction_entries")
        .select("account_id, signed_amount"),

      supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  const allAccounts = (accounts ?? []) as Account[];
  const allEntries = (entries ?? []) as Entry[];
  const allProfiles = (profiles ?? []) as Profile[];

  const companyCash = allAccounts.find(
    (account) => account.account_type === "company_cash"
  );

  if (!companyCash) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
        <Link
          href="/finance"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الصندوق
        </Link>

        <div className="rounded-2xl border border-red-400/20 bg-[#071d31] p-6">
          <h1 className="text-xl font-bold text-white">
            صندوق الشركة غير موجود
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            يجب إنشاء حساب من نوع company_cash أولًا.
          </p>
        </div>
      </div>
    );
  }

  /*
   * بعد هذا الفحص TypeScript يعرف أن صندوق الشركة موجود.
   * نضعه في ثابت مستقل حتى يبقى الـ narrowing صحيحًا
   * داخل Server Action transferMoney أيضًا.
   */
  const companyCashAccount = companyCash;

  function getBalance(accountId: string) {
    return allEntries
      .filter((entry) => entry.account_id === accountId)
      .reduce((sum, entry) => sum + Number(entry.signed_amount), 0);
  }

  const companyBalance = getBalance(companyCashAccount.id);

  const staffWallets = allAccounts.filter(
    (account) => account.account_type === "staff_wallet"
  );

  const staffWalletData = staffWallets.map((wallet) => {
    const owner = allProfiles.find(
      (profile) => profile.id === wallet.owner_user_id
    );

    return {
      ...wallet,
      balance: getBalance(wallet.id),
      owner,
    };
  });

  async function transferMoney(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!currentProfile || currentProfile.role !== "superadmin") {
      redirect("/finance");
    }

    const destinationAccountId = String(
      formData.get("destination_account_id") || ""
    );

    const amount = Number(formData.get("amount"));

    const transactionDate = String(
      formData.get("transaction_date") || ""
    );

    const description = String(
      formData.get("description") || ""
    ).trim();

    const reference = String(
      formData.get("reference") || ""
    ).trim();

    if (!destinationAccountId) {
      throw new Error("يجب اختيار صندوق المسؤول");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("مبلغ التحويل غير صحيح");
    }

    if (!transactionDate) {
      throw new Error("يجب تحديد تاريخ التحويل");
    }

    if (destinationAccountId === companyCashAccount.id) {
      throw new Error("لا يمكن تحويل المال إلى صندوق الشركة نفسه");
    }

    /*
     * نتحقق من صندوق المستفيد مرة ثانية من قاعدة البيانات
     * بدل الاعتماد على البيانات الموجودة في الصفحة فقط.
     */
    const { data: destinationAccount } = await supabase
      .from("financial_accounts")
      .select("id, account_type, owner_user_id, is_active")
      .eq("id", destinationAccountId)
      .single();

    if (
      !destinationAccount ||
      !destinationAccount.is_active ||
      destinationAccount.account_type !== "staff_wallet" ||
      !destinationAccount.owner_user_id
    ) {
      throw new Error("صندوق المسؤول غير صالح");
    }

    /*
     * نحسب رصيد صندوق الشركة الحالي من القيود المالية.
     * هذا مهم جدًا لأن الرصيد الموجود عند فتح الصفحة
     * قد يكون تغير قبل الضغط على تنفيذ التحويل.
     */
    const {
      data: companyEntries,
      error: companyEntriesError,
    } = await supabase
      .from("financial_transaction_entries")
      .select("signed_amount")
      .eq("account_id", companyCashAccount.id);

    if (companyEntriesError) {
      throw new Error(companyEntriesError.message);
    }

    const currentCompanyBalance =
      companyEntries?.reduce(
        (sum, entry) => sum + Number(entry.signed_amount),
        0
      ) ?? 0;

    /*
     * منع التحويل بأكثر من الرصيد المتاح.
     */
    if (amount > currentCompanyBalance) {
      throw new Error(
        `رصيد صندوق الشركة غير كافٍ. الرصيد الحالي: ${currentCompanyBalance} ل.س`
      );
    }

    /*
     * إنشاء الحركة المالية.
     *
     * transfer = حركة داخلية بين صندوقين.
     * لذلك لا تعتبر إيرادًا ولا مصروفًا.
     */
    const {
      data: transaction,
      error: transactionError,
    } = await supabase
      .from("financial_transactions")
      .insert({
        transaction_type: "transfer",
        amount,
        transaction_date: transactionDate,
        description:
          description || "تحويل من صندوق الشركة إلى صندوق المسؤول",
        reference: reference || null,
        created_by: user.id,
        metadata: {
          from_account_id: companyCashAccount.id,
          to_account_id: destinationAccount.id,
          transfer_type: "company_to_staff_wallet",
        },
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      throw new Error(
        transactionError?.message || "تعذر إنشاء حركة التحويل"
      );
    }

    /*
     * نضيف القيدين معًا:
     *
     * صندوق الشركة: -amount
     * صندوق المسؤول: +amount
     *
     * وبالتالي مجموع الحركة = صفر.
     */
    const { error: entriesError } = await supabase
      .from("financial_transaction_entries")
      .insert([
        {
          transaction_id: transaction.id,
          account_id: companyCashAccount.id,
          signed_amount: -amount,
        },
        {
          transaction_id: transaction.id,
          account_id: destinationAccount.id,
          signed_amount: amount,
        },
      ]);

    if (entriesError) {
      /*
       * نحاول حذف الحركة التي تم إنشاؤها
       * طالما لم يتم إنشاء أي قيد لها.
       *
       * هذا مجرد تنظيف للحالة الجزئية في حال فشل إدخال القيود.
       */
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transaction.id);

      throw new Error(entriesError.message);
    }

    redirect("/finance");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      {/* Back */}
      <Link
        href="/finance"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الصندوق
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/10 p-3">
            <ArrowLeftRight className="h-6 w-6 text-cyan-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              تحويل إلى صندوق مسؤول
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              تمويل صندوق المسؤول من صندوق الشركة
            </p>
          </div>
        </div>
      </div>

      {/* Company balance */}
      <div className="rounded-2xl border border-cyan-400/20 bg-[#071d31] p-5 shadow-[0_0_30px_rgba(0,217,245,0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              رصيد صندوق الشركة المتاح
            </p>

            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {new Intl.NumberFormat("ar-SY").format(
                Math.max(companyBalance, 0)
              )}{" "}
              ل.س
            </p>
          </div>

          <div className="rounded-xl bg-cyan-400/10 p-3">
            <Building2 className="h-7 w-7 text-cyan-400" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/10 bg-[#061728] px-4 py-3 text-sm text-slate-400">
          التحويل بين الصناديق الداخلية لا يُعتبر إيرادًا أو مصروفًا.
          <br />
          يتم خصم المبلغ من صندوق الشركة وإضافته إلى صندوق المسؤول.
        </div>
      </div>

      {/* Staff wallets */}
      {staffWalletData.length > 0 && (
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-400" />

            <h2 className="font-semibold text-white">
              أرصدة صناديق المسؤولين
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {staffWalletData.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-xl border border-white/5 bg-[#061728] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {wallet.owner?.full_name ||
                        wallet.owner?.username ||
                        wallet.name}
                    </p>

                    {wallet.owner?.username && (
                      <p className="mt-1 text-xs text-slate-500">
                        @{wallet.owner.username}
                      </p>
                    )}
                  </div>

                  <p className="font-semibold text-cyan-400">
                    {new Intl.NumberFormat("ar-SY").format(
                      Math.max(wallet.balance, 0)
                    )}{" "}
                    ل.س
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer form */}
      <form
        action={transferMoney}
        className="space-y-5 rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6"
      >
        <div>
          <label
            htmlFor="destination_account_id"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            صندوق المسؤول
          </label>

          <select
            id="destination_account_id"
            name="destination_account_id"
            required
            defaultValue=""
            className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          >
            <option value="" disabled>
              اختر المسؤول
            </option>

            {staffWalletData.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.owner?.full_name ||
                  wallet.owner?.username ||
                  wallet.name}{" "}
                — الرصيد الحالي{" "}
                {new Intl.NumberFormat("ar-SY").format(
                  Math.max(wallet.balance, 0)
                )}{" "}
                ل.س
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            مبلغ التحويل
          </label>

          <div className="relative">
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              max={Math.max(companyBalance, 0)}
              required
              placeholder="مثال: 500000"
              className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 pl-16 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
            />

            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              ل.س
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            الحد الأقصى المتاح للتحويل:{" "}
            <span className="font-medium text-cyan-400">
              {new Intl.NumberFormat("ar-SY").format(
                Math.max(companyBalance, 0)
              )}{" "}
              ل.س
            </span>
          </p>
        </div>

        <div>
          <label
            htmlFor="transaction_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            تاريخ التحويل
          </label>

          <input
            id="transaction_date"
            name="transaction_date"
            type="date"
            defaultValue={today}
            required
            className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          />
        </div>

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
            placeholder="مثال: تمويل صندوق المسؤول للمصروفات الميدانية"
            className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
          />
        </div>

        <div>
          <label
            htmlFor="reference"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            المرجع
          </label>

          <input
            id="reference"
            name="reference"
            type="text"
            placeholder="اختياري"
            className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          />
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-cyan-400/10 bg-[#061728] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              المصدر
            </span>

            <span className="font-medium text-white">
              صندوق الشركة
            </span>
          </div>

          <div className="my-3 h-px bg-white/5" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              المستفيد
            </span>

            <span className="font-medium text-white">
              صندوق المسؤول المحدد
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-slate-400">
          <span className="font-medium text-amber-300">
            تنبيه:
          </span>{" "}
          هذا التحويل لا يُسجل كمصروف على الشركة.
          هو مجرد نقل للأموال من صندوق الشركة إلى صندوق المسؤول.
          المصروف يُسجل لاحقًا عند استخدام المال فعليًا.
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/finance"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            إلغاء
          </Link>

          <button
            type="submit"
            disabled={companyBalance <= 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#031321] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftRight className="h-4 w-4" />
            تنفيذ التحويل
          </button>
        </div>
      </form>
    </div>
  );
}