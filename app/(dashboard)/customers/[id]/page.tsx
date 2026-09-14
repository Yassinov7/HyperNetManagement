import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  Package,
  Router,
  Wallet,
  Pencil,
  Plus,
  Ban,
  CalendarDays,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import OpeningBalanceDialog from "./OpeningBalanceDialog";
type Props = {
  params: Promise<{ id: string }>;
};

const END_REASONS = [
  {
    value: "quota_exhausted",
    label: "انتهاء الحصة",
  },
  {
    value: "customer_cancelled",
    label: "إلغاء العميل",
  },
  {
    value: "customer_suspended",
    label: "إيقاف العميل",
  },
  {
    value: "early_termination",
    label: "إنهاء مبكر",
  },
  {
    value: "other",
    label: "أخرى",
  },
];

export default async function CustomerDetailsPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: customer, error: customerError },
    { data: cpes },
    { data: subscriptions },
    { data: charges },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("cpes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("subscriptions")
      .select(`
        *,
        packages (
          id,
          name,
          type,
          speed_mbps,
          data_limit_gb,
          duration_days
        )
      `)
      .eq("customer_id", id)
      .order("started_at", { ascending: false }),

    supabase
      .from("charges")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("payments")
      .select("*")
      .eq("customer_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  if (customerError || !customer) {
    notFound();
  }

  const totalCharges =
    charges?.reduce(
      (sum, charge) => sum + Number(charge.amount),
      0
    ) ?? 0;

  const totalPayments =
    payments?.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    ) ?? 0;

  const outstanding = totalCharges - totalPayments;

  /*
   * الاشتراك الحالي:
   * - يجب أن يكون active
   * - لم يتم إنهاؤه يدويًا
   * - لم تنتهِ مدته بعد
   */
  const currentSubscription = subscriptions?.find(
    (subscription) =>
      subscription.status === "active" &&
      !subscription.ended_at &&
      new Date(subscription.expires_at) > new Date()
  );

  const currentPackage = currentSubscription?.packages;

  const statusLabel =
    customer.status === "active"
      ? "نشط"
      : customer.status === "suspended"
        ? "موقوف"
        : "غير نشط";

  const statusClass =
    customer.status === "active"
      ? "bg-emerald-400/10 text-emerald-300"
      : customer.status === "suspended"
        ? "bg-red-400/10 text-red-300"
        : "bg-slate-400/10 text-slate-300";

  /*
   * إنهاء الاشتراك
   *
   * لا نحذف الاشتراك.
   * فقط نسجل وقت الإنهاء والسبب ونغيّر حالته إلى ended.
   */
  async function endSubscription(formData: FormData) {
    "use server";

    const subscriptionId = String(
      formData.get("subscription_id") || ""
    );

    const reason = String(
      formData.get("end_reason") || ""
    );

    if (!subscriptionId || !reason) {
      return;
    }

    const validReason = END_REASONS.some(
      (item) => item.value === reason
    );

    if (!validReason) {
      return;
    }

    const supabase = await createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    /*
     * نتأكد أن الاشتراك تابع لهذا العميل
     * وما زال active قبل إنهائه.
     */
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status, ended_at")
      .eq("id", subscriptionId)
      .eq("customer_id", id)
      .single();

    if (
      !subscription ||
      subscription.status !== "active" ||
      subscription.ended_at
    ) {
      redirect(`/customers/${id}`);
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        end_reason: reason,
      })
      .eq("id", subscriptionId)
      .eq("customer_id", id);

    if (error) {
      throw new Error(
        `تعذر إنهاء الاشتراك: ${error.message}`
      );
    }

    redirect(`/customers/${id}`);
  }

  return (
    <div dir="rtl" className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <Link
            href="/customers"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-[#00D9F5]"
          >
            <ArrowRight size={16} />
            العودة إلى العملاء
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {customer.full_name}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            تفاصيل العميل والحساب المالي
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

  <Link
    href={`/customers/${id}/edit`}
    className="inline-flex items-center gap-2 rounded-xl border border-[#0B4668] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-[#00D9F5] hover:text-[#00D9F5]"
  >
    <Pencil size={16} />
    تعديل
  </Link>

  <Link
    href={`/customers/${id}/add-cpe`}
    className="inline-flex items-center gap-2 rounded-xl border border-[#0B4668] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-[#00D9F5] hover:text-[#00D9F5]"
  >
    <Router size={16} />
    إضافة CPE
  </Link>

  <Link
    href={`/customers/${id}/add-package`}
    className="inline-flex items-center gap-2 rounded-xl bg-[#00D9F5] px-4 py-2.5 text-sm font-bold text-[#06294A] transition hover:bg-[#12E8F5]"
  >
    <Plus size={16} />
    إضافة باقة
  </Link>

  <Link
    href={`/customers/${id}/add-payment`}
    className="inline-flex items-center gap-2 rounded-xl border border-[#00D9F5] px-4 py-2.5 text-sm font-semibold text-[#00D9F5] transition hover:bg-[#00D9F5]/10"
  >
    <CreditCard size={16} />
    تسجيل دفعة
  </Link>

  <OpeningBalanceDialog
    customerId={customer.id}
    customerName={customer.full_name}
  />

</div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="إجمالي المستحقات"
          value={formatMoney(totalCharges)}
          icon={<Wallet size={22} />}
        />

        <StatCard
          title="إجمالي المدفوعات"
          value={formatMoney(totalPayments)}
          icon={<CreditCard size={22} />}
        />

        <StatCard
          title="المتبقي"
          value={formatMoney(outstanding)}
          icon={<Wallet size={22} />}
          danger={outstanding > 0}
        />

        <StatCard
          title="الأجهزة"
          value={String(cpes?.length ?? 0)}
          icon={<Router size={22} />}
        />

      </div>

      {/* Customer + Current Package */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Customer Information */}
        <section className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

          <div className="border-b border-[#0B4668] p-5">
            <h2 className="font-bold text-white">
              معلومات العميل
            </h2>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">

            <InfoItem
              label="الاسم"
              value={customer.full_name}
            />

            <InfoItem
              label="اسم المستخدم"
              value={customer.username}
            />

            <InfoItem
              label="رقم الهاتف"
              value={customer.phone}
            />

            <InfoItem
              label="البرج"
              value={customer.tower}
            />

          </div>

          {customer.notes && (
            <div className="border-t border-[#0B4668] p-5">
              <p className="mb-2 text-xs text-slate-500">
                ملاحظات
              </p>

              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {customer.notes}
              </p>
            </div>
          )}

        </section>

        {/* Current Package */}
        <section className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

          <div className="flex items-center justify-between border-b border-[#0B4668] p-5">

            <div>
              <h2 className="font-bold text-white">
                الباقة الحالية
              </h2>

              {currentSubscription && (
                <p className="mt-1 text-xs text-slate-500">
                  الاشتراك الفعال حاليًا
                </p>
              )}
            </div>

            <Package
              size={20}
              className="text-[#00D9F5]"
            />

          </div>

          {currentPackage ? (
            <div className="p-5">

              <div className="rounded-xl border border-[#0B4668] bg-[#041F38] p-5">

                <div className="flex items-center justify-between gap-4">

                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {currentPackage.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {currentPackage.speed_mbps} Mbps
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg bg-[#00D9F5]/10 px-3 py-1 text-xs font-semibold text-[#00D9F5]">
                    {currentPackage.type === "unlimited"
                      ? "غير محدودة"
                      : `${currentPackage.data_limit_gb} GB`}
                  </span>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">

                  <InfoItem
                    label="تاريخ البداية"
                    value={formatDate(
                      currentSubscription.started_at
                    )}
                  />

                  <InfoItem
                    label="تاريخ الانتهاء"
                    value={formatDate(
                      currentSubscription.expires_at
                    )}
                  />

                </div>

                <div className="mt-5 border-t border-[#0B4668] pt-5">

                  <p className="mb-3 text-xs font-semibold text-slate-500">
                    إنهاء الاشتراك
                  </p>

                  <form
                    action={endSubscription}
                    className="space-y-3"
                  >
                    <input
                      type="hidden"
                      name="subscription_id"
                      value={currentSubscription.id}
                    />

                    <select
                      name="end_reason"
                      required
                      defaultValue=""
                      className="w-full rounded-xl border border-[#0B4668] bg-[#06294A] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00D9F5]"
                    >
                      <option value="" disabled>
                        اختر سبب الإنهاء
                      </option>

                      {END_REASONS.map((reason) => (
                        <option
                          key={reason.value}
                          value={reason.value}
                        >
                          {reason.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                      <Ban size={16} />
                      إنهاء الاشتراك
                    </button>
                  </form>

                </div>

              </div>

            </div>
          ) : (
            <div className="p-10 text-center">

              <Package
                size={32}
                className="mx-auto mb-3 text-slate-600"
              />

              <p className="text-sm text-slate-400">
                لا توجد باقة فعالة حالياً
              </p>

              <Link
                href={`/customers/${id}/add-package`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00D9F5] px-4 py-2 text-sm font-bold text-[#06294A]"
              >
                <Plus size={16} />
                إضافة باقة
              </Link>

            </div>
          )}

        </section>

      </div>

      {/* Subscription History */}
      <section className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

        <div className="border-b border-[#0B4668] p-5">

          <div className="flex items-center gap-3">
            <CalendarDays
              size={20}
              className="text-[#00D9F5]"
            />

            <div>
              <h2 className="font-bold text-white">
                سجل الاشتراكات
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                جميع اشتراكات العميل السابقة والحالية
              </p>
            </div>
          </div>

        </div>

        {subscriptions && subscriptions.length > 0 ? (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-right">

              <thead className="border-b border-[#0B4668] bg-[#041F38]/50">
                <tr>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الباقة
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    البداية
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الانتهاء المخطط
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الحالة
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    سبب الإنهاء
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-[#0B4668]">

                {subscriptions.map((subscription) => {

                  const packageData = subscription.packages;

                  const isEnded =
                    subscription.status === "ended" ||
                    Boolean(subscription.ended_at);

                  const isExpired =
                    !isEnded &&
                    subscription.status !== "active";

                  const isCurrent =
                    subscription.status === "active" &&
                    !subscription.ended_at &&
                    new Date(subscription.expires_at) > new Date();

                  let subscriptionStatus = "غير معروف";
                  let subscriptionStatusClass =
                    "bg-slate-400/10 text-slate-300";

                  if (isCurrent) {
                    subscriptionStatus = "فعال";
                    subscriptionStatusClass =
                      "bg-emerald-400/10 text-emerald-300";
                  } else if (isEnded) {
                    subscriptionStatus = "منتهي مبكرًا";
                    subscriptionStatusClass =
                      "bg-orange-400/10 text-orange-300";
                  } else if (isExpired) {
                    subscriptionStatus = "منتهي";
                    subscriptionStatusClass =
                      "bg-slate-400/10 text-slate-300";
                  }

                  return (
                    <tr key={subscription.id}>

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-white">
                          {packageData?.name || "باقة محذوفة"}
                        </p>

                        {packageData?.speed_mbps && (
                          <p className="mt-1 text-xs text-slate-500">
                            {packageData.speed_mbps} Mbps
                          </p>
                        )}

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(subscription.started_at)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(subscription.expires_at)}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${subscriptionStatusClass}`}
                        >
                          {subscriptionStatus}
                        </span>

                        {subscription.ended_at && (
                          <p className="mt-2 text-xs text-slate-500">
                            أنهِي في{" "}
                            {formatDate(subscription.ended_at)}
                          </p>
                        )}

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {subscription.end_reason
                          ? getEndReasonLabel(
                              subscription.end_reason
                            )
                          : "—"}
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            لا يوجد سجل اشتراكات
          </div>
        )}

      </section>

      {/* CPEs */}
      <section className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

        <div className="flex items-center justify-between border-b border-[#0B4668] p-5">

          <div>
            <h2 className="font-bold text-white">
              أجهزة CPE
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              أجهزة العميل المسجلة
            </p>
          </div>

          <Link
            href={`/customers/${customer.id}/add-cpe`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#0B4668] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#00D9F5] hover:text-[#00D9F5]"
          >
            <Plus size={15} />
            إضافة
          </Link>

        </div>

        {cpes && cpes.length > 0 ? (
          <div className="overflow-x-auto">

            <table className="w-full text-right">

              <thead className="border-b border-[#0B4668] bg-[#041F38]/50">
                <tr>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الجهاز
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الملكية
                  </th>

                  <th className="px-5 py-3 text-xs text-slate-400">
                    الملاحظات
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-[#0B4668]">

                {cpes.map((cpe) => (
                  <tr key={cpe.id}>

                    <td className="px-5 py-4 text-sm text-white">
                      {cpe.id.slice(0, 8)}
                    </td>

                    <td className="px-5 py-4">

                      <span className="rounded-full bg-[#00D9F5]/10 px-3 py-1 text-xs text-[#00D9F5]">
                        {cpe.ownership_type === "company"
                          ? "ملك الشركة"
                          : "مباع"}
                      </span>

                    </td>

                    <td className="px-5 py-4 text-sm text-slate-400">
                      {cpe.notes || "—"}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            لا توجد أجهزة CPE مسجلة
          </div>
        )}

      </section>

      {/* Financial History */}
      <section className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

        <div className="border-b border-[#0B4668] p-5">

          <h2 className="font-bold text-white">
            السجل المالي
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            جميع المطالبات والدفعات والرصيد السابق
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[700px] text-right">

            <thead className="border-b border-[#0B4668] bg-[#041F38]/50">

              <tr>

                <th className="px-5 py-3 text-xs text-slate-400">
                  النوع
                </th>

                <th className="px-5 py-3 text-xs text-slate-400">
                  الوصف
                </th>

                <th className="px-5 py-3 text-xs text-slate-400">
                  المبلغ
                </th>

                <th className="px-5 py-3 text-xs text-slate-400">
                  التاريخ
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-[#0B4668]">

              {[
                ...(charges ?? []).map((charge) => ({
                  id: `charge-${charge.id}`,
                  type: "charge",
                  chargeType: charge.type,
                  description:
                    charge.description || "مستحق مالي",
                  amount: Number(charge.amount),
                  date: charge.created_at,
                })),

                ...(payments ?? []).map((payment) => ({
                  id: `payment-${payment.id}`,
                  type: "payment",
                  chargeType: null,
                  description:
                    payment.notes || "دفعة",
                  amount: Number(payment.amount),
                  date: payment.payment_date,
                })),
              ]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() -
                    new Date(a.date).getTime()
                )
                .map((item) => {

                  const isOpeningBalance =
                    item.chargeType === "opening_balance";

                  return (
                    <tr key={item.id}>

                      <td className="px-5 py-4">

                        <span
                          className={
                            item.type === "charge"
                              ? isOpeningBalance
                                ? "rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-300"
                                : "rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300"
                              : "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                          }
                        >
                          {item.type === "payment"
                            ? "دفعة"
                            : isOpeningBalance
                              ? "رصيد سابق"
                              : "مستحق"}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {item.description}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-bold ${
                          item.type === "charge"
                            ? isOpeningBalance
                              ? "text-orange-300"
                              : "text-red-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {formatMoney(item.amount)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(item.date)}
                      </td>

                    </tr>
                  );
                })}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70 p-5">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger ? "text-red-300" : "text-white"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#00D9F5]/10 p-3 text-[#00D9F5]">
          {icon}
        </div>

      </div>

    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function getEndReasonLabel(reason: string) {
  const item = END_REASONS.find(
    (reasonItem) => reasonItem.value === reason
  );

  return item?.label || reason;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("en-US")} ل.س`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}