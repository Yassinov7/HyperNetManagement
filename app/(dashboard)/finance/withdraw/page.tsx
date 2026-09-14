import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowDownToLine,
  Building2,
  Wallet,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WithdrawForm from "./WithdrawForm";

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
  role: "superadmin" | "responsible";
};

type Entry = {
  account_id: string;
  signed_amount: number | string;
};

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    available?: string;
    requested?: string;
  }>;
}) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, full_name, username, role")
    .eq("id", user.id)
    .single();

  if (!currentProfile) {
    redirect("/login");
  }

  const isSuperadmin = currentProfile.role === "superadmin";

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
        .select("id, full_name, username, role")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  const allAccounts = (accounts ?? []) as Account[];
  const allEntries = (entries ?? []) as Entry[];
  const allProfiles = (profiles ?? []) as Profile[];

  function getBalance(accountId: string) {
    return Math.max(
      allEntries
        .filter((entry) => entry.account_id === accountId)
        .reduce((sum, entry) => sum + Number(entry.signed_amount), 0),
      0
    );
  }

  const availableAccounts = isSuperadmin
    ? allAccounts
    : allAccounts.filter(
        (account) =>
          account.account_type === "staff_wallet" &&
          account.owner_user_id === user.id
      );

  const accountsForForm = availableAccounts.map((account) => {
    let label = account.name;

    if (account.account_type === "company_cash") {
      label = "صندوق الشركة";
    }

    if (account.account_type === "staff_wallet") {
      const owner = allProfiles.find(
        (profile) => profile.id === account.owner_user_id
      );

      label =
        owner?.full_name ||
        owner?.username ||
        account.name;
    }

    return {
      id: account.id,
      label,
      balance: getBalance(account.id),
      accountType: account.account_type,
    };
  });

  const today = new Date().toISOString().slice(0, 10);

  async function withdrawMoney(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      redirect("/login");
    }

    const isSuperadmin = profile.role === "superadmin";

    const sourceAccountId = String(
      formData.get("source_account_id") || ""
    );

    const amount = Number(formData.get("amount"));

    const transactionDate = String(
      formData.get("transaction_date") || ""
    );

    const withdrawalType = String(
      formData.get("withdrawal_type") || ""
    );

    const description = String(
      formData.get("description") || ""
    ).trim();

    const reference = String(
      formData.get("reference") || ""
    ).trim();

    if (!sourceAccountId) {
      redirect("/finance/withdraw?error=missing_account");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      redirect("/finance/withdraw?error=invalid_amount");
    }

    if (!transactionDate) {
      redirect("/finance/withdraw?error=missing_date");
    }

    if (
      withdrawalType !== "cash_withdrawal" &&
      withdrawalType !== "owner_withdrawal"
    ) {
      redirect("/finance/withdraw?error=invalid_type");
    }

    if (withdrawalType === "owner_withdrawal" && !isSuperadmin) {
      redirect("/finance/withdraw?error=not_allowed");
    }

    const { data: sourceAccount } = await supabase
      .from("financial_accounts")
      .select(
        "id, name, account_type, owner_user_id, is_active"
      )
      .eq("id", sourceAccountId)
      .single();

    if (!sourceAccount || !sourceAccount.is_active) {
      redirect("/finance/withdraw?error=account_not_found");
    }

    if (
      !isSuperadmin &&
      !(
        sourceAccount.account_type === "staff_wallet" &&
        sourceAccount.owner_user_id === user.id
      )
    ) {
      redirect("/finance/withdraw?error=not_allowed");
    }

    if (
      withdrawalType === "owner_withdrawal" &&
      sourceAccount.account_type !== "company_cash"
    ) {
      redirect("/finance/withdraw?error=owner_company_only");
    }

    const { data: sourceEntries, error: sourceEntriesError } =
      await supabase
        .from("financial_transaction_entries")
        .select("signed_amount")
        .eq("account_id", sourceAccountId);

    if (sourceEntriesError) {
      redirect("/finance/withdraw?error=balance_error");
    }

    const currentBalance =
      sourceEntries?.reduce(
        (sum, entry) => sum + Number(entry.signed_amount),
        0
      ) ?? 0;

    if (amount > currentBalance) {
      redirect(
        `/finance/withdraw?error=insufficient&available=${encodeURIComponent(
          currentBalance
        )}&requested=${encodeURIComponent(amount)}`
      );
    }

    const transactionDescription =
      description ||
      (withdrawalType === "owner_withdrawal"
        ? "سحب شخصي للمالك"
        : "سحب نقدي من الصندوق");

    const { data: transaction, error: transactionError } =
      await supabase
        .from("financial_transactions")
        .insert({
          transaction_type: "withdrawal",
          amount,
          transaction_date: transactionDate,
          description: transactionDescription,
          reference: reference || null,
          created_by: user.id,
          metadata: {
            withdrawal_type: withdrawalType,
            source_account_id: sourceAccountId,
            source_account_type: sourceAccount.account_type,
          },
        })
        .select("id")
        .single();

    if (transactionError || !transaction) {
      redirect("/finance/withdraw?error=transaction_error");
    }

    const { error: entryError } = await supabase
      .from("financial_transaction_entries")
      .insert({
        transaction_id: transaction.id,
        account_id: sourceAccountId,
        signed_amount: -amount,
      });

    if (entryError) {
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("created_by", user.id);

      redirect("/finance/withdraw?error=entry_error");
    }

    if (withdrawalType === "owner_withdrawal") {
      const { error: ownerWithdrawalError } = await supabase
        .from("owner_withdrawals")
        .insert({
          amount,
          withdrawal_date: transactionDate,
          withdrawn_from_account_id: sourceAccountId,
          beneficiary_user_id: user.id,
          description: transactionDescription,
          reference: reference || null,
          financial_transaction_id: transaction.id,
          created_by: user.id,
        });

      if (ownerWithdrawalError) {
        redirect("/finance/withdraw?error=owner_record_error");
      }
    }

    redirect("/finance");
  }

  const errorMessage = (() => {
    switch (params.error) {
      case "insufficient":
        return {
          title: "الرصيد غير كافٍ",
          message: `المبلغ المطلوب ${Number(
            params.requested ?? 0
          ).toLocaleString("ar-SY")} ل.س، بينما المتاح فقط ${Number(
            params.available ?? 0
          ).toLocaleString("ar-SY")} ل.س.`,
        };

      case "missing_account":
        return {
          title: "اختر الصندوق",
          message: "يجب اختيار الصندوق الذي سيتم السحب منه.",
        };

      case "invalid_amount":
        return {
          title: "مبلغ غير صحيح",
          message: "أدخل مبلغًا أكبر من صفر.",
        };

      case "missing_date":
        return {
          title: "التاريخ مطلوب",
          message: "يرجى تحديد تاريخ السحب.",
        };

      case "not_allowed":
        return {
          title: "غير مسموح",
          message: "ليس لديك صلاحية للسحب من هذا الصندوق.",
        };

      case "owner_company_only":
        return {
          title: "حساب غير صالح",
          message: "السحب الشخصي للمالك يكون من صندوق الشركة فقط.",
        };

      case "account_not_found":
        return {
          title: "الصندوق غير موجود",
          message: "الصندوق المحدد غير موجود أو غير فعال.",
        };

      case "balance_error":
        return {
          title: "تعذر قراءة الرصيد",
          message: "حدث خطأ أثناء التحقق من رصيد الصندوق.",
        };

      case "transaction_error":
        return {
          title: "تعذر تسجيل السحب",
          message: "حدث خطأ أثناء إنشاء الحركة المالية.",
        };

      case "entry_error":
        return {
          title: "تعذر إتمام السحب",
          message: "تعذر تسجيل القيد المالي. لم يتم اعتماد السحب.",
        };

      case "owner_record_error":
        return {
          title: "تعذر تسجيل مسحوبات المالك",
          message:
            "تم تسجيل الحركة المالية، لكن تعذر إنشاء سجل مسحوبات المالك.",
        };

      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <Link
        href="/finance"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الصندوق
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/10 p-3">
            <ArrowDownToLine className="h-6 w-6 text-cyan-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              سحب من الصندوق
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              تسجيل خروج أموال من أحد الصناديق
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-red-400/10 p-2">
              <ArrowDownToLine className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <p className="font-semibold text-red-300">
                {errorMessage.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-red-200/70">
                {errorMessage.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Building2 className="h-5 w-5 text-cyan-400" />

            <p className="mt-2 text-sm font-medium text-white">
              صندوق الشركة
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              السحب منه يقلل أموال الشركة الفعلية.
            </p>
          </div>

          <div>
            <Wallet className="h-5 w-5 text-cyan-400" />

            <p className="mt-2 text-sm font-medium text-white">
              صندوق المسؤول
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              لا يمكن سحب أكثر من الرصيد المتاح.
            </p>
          </div>

          <div>
            <UserRound className="h-5 w-5 text-cyan-400" />

            <p className="mt-2 text-sm font-medium text-white">
              السحب الشخصي
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              متاح للـ Superadmin فقط.
            </p>
          </div>
        </div>
      </div>

      <WithdrawForm
        accounts={accountsForForm}
        today={today}
        isSuperadmin={isSuperadmin}
        action={withdrawMoney}
      />
    </div>
  );
}