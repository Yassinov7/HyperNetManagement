import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AddPaymentPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: customer },
    { data: charges },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, username")
      .eq("id", id)
      .single(),

    supabase
      .from("charges")
      .select("amount")
      .eq("customer_id", id),

    supabase
      .from("payments")
      .select("amount")
      .eq("customer_id", id),
  ]);

  if (!customer) {
    redirect("/customers");
  }

  const customerName = customer.full_name;

  const totalCharges =
    charges?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;

  const totalPayments =
    payments?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;

  const outstanding = Math.max(totalCharges - totalPayments, 0);

  async function addPayment(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const amount = Number(formData.get("amount"));
    const paymentDate = String(formData.get("payment_date") || "");
    const paymentMethod = String(
      formData.get("payment_method") || ""
    );
    const reference = String(formData.get("reference") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid payment amount");
    }

    if (!paymentDate) {
      throw new Error("Payment date is required");
    }

    if (!["cash", "transfer", "other"].includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // =========================================================
    // 1. الحصول على صندوق الشركة
    // =========================================================

    const { data: companyCash, error: companyCashError } =
      await supabase
        .from("financial_accounts")
        .select("id, name")
        .eq("account_type", "company_cash")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (companyCashError) {
      throw new Error(companyCashError.message);
    }

    if (!companyCash) {
      throw new Error("لم يتم العثور على صندوق الشركة");
    }

    // =========================================================
    // 2. إنشاء الحركة المالية
    // =========================================================

    const { data: financialTransaction, error: transactionError } =
      await supabase
        .from("financial_transactions")
        .insert({
          transaction_type: "customer_payment",
          amount,
          transaction_date: paymentDate,
          description:
            notes ||
              `دفعة من العميل: ${customerName}`,
          reference: reference || null,
          customer_id: id,
          created_by: user.id,
          metadata: {
            payment_method: paymentMethod,
            source: "customer_payment",
          },
        })
        .select("id")
        .single();

    if (transactionError || !financialTransaction) {
      throw new Error(
        transactionError?.message ||
          "فشل إنشاء الحركة المالية"
      );
    }

    // =========================================================
    // 3. تسجيل دخول المبلغ إلى صندوق الشركة
    // =========================================================

    const { error: entryError } = await supabase
      .from("financial_transaction_entries")
      .insert({
        transaction_id: financialTransaction.id,
        account_id: companyCash.id,
        signed_amount: amount,
      });

    if (entryError) {
      // تنظيف الحركة المالية التي أنشأناها للتو
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", financialTransaction.id);

      throw new Error(
        `فشل تسجيل المبلغ في صندوق الشركة: ${entryError.message}`
      );
    }

    // =========================================================
    // 4. إنشاء سجل payment وربطه بالحركة المالية
    // =========================================================

    const { data: payment, error: paymentError } =
      await supabase
        .from("payments")
        .insert({
          customer_id: id,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference: reference || null,
          notes: notes || null,
          created_by: user.id,

          // ربط الدفعة بالحركة المالية
          financial_transaction_id: financialTransaction.id,

          // كل دفعات العملاء تدخل صندوق الشركة
          financial_account_id: companyCash.id,
        })
        .select("id")
        .single();

    if (paymentError || !payment) {
      // حذف entry أولًا
      await supabase
        .from("financial_transaction_entries")
        .delete()
        .eq(
          "transaction_id",
          financialTransaction.id
        );

      // ثم حذف transaction
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", financialTransaction.id);

      throw new Error(
        paymentError?.message ||
          "فشل تسجيل دفعة العميل"
      );
    }

    // =========================================================
    // 5. نجاح العملية
    // =========================================================

    redirect(`/customers/${id}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6" dir="rtl">
      <Link
        href={`/customers/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى ملف العميل
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">
          تسجيل دفعة
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          {customer.full_name}
          {customer.username
            ? ` — @${customer.username}`
            : ""}
        </p>
      </div>

      {/* Current balance */}
      <div className="rounded-2xl border border-cyan-400/20 bg-[#071d31] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              المتبقي الحالي
            </p>

            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {new Intl.NumberFormat("ar-SY").format(
                outstanding
              )}{" "}
              ل.س
            </p>
          </div>

          <div className="rounded-xl bg-cyan-400/10 p-3">
            <CreditCard className="h-6 w-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Payment form */}
      <form
        action={addPayment}
        className="space-y-5 rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            المبلغ
          </label>

          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            placeholder="مثال: 100000"
            className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            تاريخ الدفع
          </label>

          <input
            name="payment_date"
            type="date"
            defaultValue={today}
            required
            className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            طريقة الدفع
          </label>

          <select
            name="payment_method"
            defaultValue="cash"
            required
            className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            رقم المرجع
          </label>

          <input
            name="reference"
            placeholder="اختياري"
            className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            ملاحظات
          </label>

          <textarea
            name="notes"
            rows={3}
            placeholder="ملاحظات إضافية..."
            className="w-full resize-none rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        {/* Financial information */}
        <div className="rounded-xl border border-cyan-400/10 bg-[#061625] p-4">
          <p className="text-sm font-medium text-slate-300">
            المعالجة المالية
          </p>

          <p className="mt-1 text-sm text-slate-500">
            سيتم تسجيل الدفعة على حساب العميل، وإضافة
            المبلغ تلقائيًا إلى صندوق الشركة.
          </p>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              الحساب المستلم
            </span>

            <span className="font-medium text-cyan-400">
              صندوق الشركة
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            تسجيل الدفعة
          </button>

          <Link
            href={`/customers/${id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 text-slate-300 transition hover:bg-slate-800"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}