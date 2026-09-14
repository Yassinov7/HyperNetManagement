import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AddPackagePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const [{ data: customer }, { data: packages }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, status")
      .eq("id", id)
      .single(),

    supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true }),
  ]);

  if (!customer) {
    redirect("/customers");
  }

  async function addPackage(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const packageId = String(formData.get("package_id") || "");

    if (!packageId) {
      throw new Error("يرجى اختيار الباقة");
    }

    // Current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    // Make sure the customer still exists
    const { data: currentCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id, status")
      .eq("id", id)
      .single();

    if (customerError || !currentCustomer) {
      throw new Error("العميل غير موجود");
    }

    // Do not allow adding a package to a suspended/inactive customer
    if (currentCustomer.status !== "active") {
      throw new Error(
        "لا يمكن إضافة باقة لعميل موقوف أو غير نشط. قم بتفعيل العميل أولًا."
      );
    }

    // Get selected package
    const { data: pkg, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (packageError || !pkg) {
      throw new Error("الباقة غير موجودة أو غير متاحة");
    }

    /*
     * Find the current active subscription.
     *
     * We intentionally do not require expires_at > now here.
     * If the subscription is marked active but its date has already
     * passed, it is still cleaned up below before the new package starts.
     */
    const { data: currentSubscription, error: currentSubscriptionError } =
      await supabase
        .from("subscriptions")
        .select("id, status, ended_at, expires_at")
        .eq("customer_id", id)
        .eq("status", "active")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (currentSubscriptionError) {
      console.error(currentSubscriptionError);
      throw new Error("تعذر التحقق من الاشتراك الحالي");
    }

    const startedAt = new Date();

    const expiresAt = new Date(startedAt);

    expiresAt.setDate(expiresAt.getDate() + pkg.duration_days);

    /*
     * 1. Create the new subscription first.
     */
    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .insert({
          customer_id: id,
          package_id: pkg.id,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          price: pkg.price,
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();

    if (subscriptionError || !subscription) {
      console.error(subscriptionError);
      throw new Error("فشل إنشاء الاشتراك الجديد");
    }

    /*
     * 2. Create the financial charge for the new package.
     */
    const { error: chargeError } = await supabase
      .from("charges")
      .insert({
        customer_id: id,
        type: "package",
        amount: pkg.price,
        description: `اشتراك ${pkg.name}`,
        subscription_id: subscription.id,
        package_id: pkg.id,
        created_by: user.id,
      });

    /*
     * If creating the charge fails, remove only the NEW subscription.
     * The old subscription is still untouched at this point.
     */
    if (chargeError) {
      console.error(chargeError);

      await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscription.id)
        .eq("customer_id", id);

      throw new Error("فشل إنشاء المطالبة المالية");
    }

    /*
     * 3. Automatically end the previous active subscription.
     *
     * We do this only after the new subscription + charge succeeded.
     *
     * No data is deleted.
     */
    if (currentSubscription) {
      const endedAt = startedAt.toISOString();

      const { error: endOldSubscriptionError } = await supabase
        .from("subscriptions")
        .update({
          status: "ended",
          ended_at: endedAt,
          end_reason: "early_termination",
        })
        .eq("id", currentSubscription.id)
        .eq("customer_id", id)
        .eq("status", "active")
        .is("ended_at", null);

      if (endOldSubscriptionError) {
        console.error(endOldSubscriptionError);

        /*
         * The new subscription and its charge already exist.
         *
         * We intentionally do NOT delete the new financial records
         * here because deleting accounting history is undesirable.
         *
         * Instead, stop the operation and report the problem.
         */
        throw new Error(
          "تم إنشاء الباقة الجديدة، لكن تعذر إنهاء الباقة السابقة تلقائيًا. يرجى مراجعة الاشتراكات."
        );
      }
    }

    redirect(`/customers/${id}`);
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          إضافة باقة
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          العميل: {customer.full_name}
        </p>
      </div>

      {/* Customer status warning */}
      {customer.status !== "active" && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-300">
            لا يمكن إضافة باقة لهذا العميل
          </p>

          <p className="mt-1 text-sm text-amber-200/70">
            يجب أن يكون العميل في حالة نشط قبل إضافة اشتراك جديد.
          </p>
        </div>
      )}

      <form
        action={addPackage}
        className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-6 shadow-[0_0_30px_rgba(0,217,245,0.04)]"
      >
        <label className="mb-2 block text-sm font-medium text-slate-300">
          اختر الباقة
        </label>

        <select
          name="package_id"
          required
          disabled={customer.status !== "active"}
          className="w-full rounded-xl border border-[#0B4668] bg-[#041F38] px-4 py-3 text-white outline-none transition focus:border-[#00D9F5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            اختر الباقة...
          </option>

          {packages?.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} — {pkg.speed_mbps} Mbps —{" "}
              {Number(pkg.price).toLocaleString()} ل.س
            </option>
          ))}
        </select>

        {/* Automatic replacement notice */}
        <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <span className="text-lg">↻</span>
            </div>

            <div>
              <p className="font-semibold text-cyan-200">
                استبدال الباقة الحالية تلقائيًا
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                إذا كان لدى العميل اشتراك فعال، سيتم إنهاؤه تلقائيًا
                عند تفعيل الباقة الجديدة، مع الاحتفاظ بكامل سجله
                المالي والتاريخي.
              </p>
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div className="mt-4 rounded-xl border border-[#0B4668] bg-[#041F38] p-4">
          <p className="text-sm font-medium text-slate-300">
            عند إضافة الباقة سيتم:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-cyan-400">✓</span>
              إنشاء اشتراك جديد
            </li>

            <li className="flex items-center gap-2">
              <span className="text-cyan-400">✓</span>
              إنشاء مطالبة مالية بقيمة الباقة
            </li>

            <li className="flex items-center gap-2">
              <span className="text-cyan-400">✓</span>
              تحديد مدة الاشتراك حسب الباقة
            </li>

            <li className="flex items-center gap-2">
              <span className="text-cyan-400">✓</span>
              إنهاء الاشتراك السابق تلقائيًا إن وجد
            </li>

            <li className="flex items-center gap-2">
              <span className="text-cyan-400">✓</span>
              الاحتفاظ بسجل الاشتراك السابق دون حذفه
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={
              customer.status !== "active" ||
              !packages ||
              packages.length === 0
            }
            className="rounded-xl bg-[#00D9F5] px-6 py-3 font-bold text-[#06294A] transition hover:bg-[#12E8F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            إضافة الباقة
          </button>

          <a
            href={`/customers/${id}`}
            className="rounded-xl border border-[#0B4668] px-6 py-3 font-semibold text-slate-300 transition hover:bg-[#041F38]"
          >
            إلغاء
          </a>
        </div>
      </form>
    </div>
  );
}