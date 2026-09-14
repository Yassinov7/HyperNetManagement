import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AddPackagePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: customer },
    { data: packages },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name")
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

    const packageId = formData.get("package_id") as string;

    if (!packageId) {
      return;
    }

    // Get selected package
    const { data: pkg, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (packageError || !pkg) {
      throw new Error("الباقة غير موجودة");
    }

    // Current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const startedAt = new Date();

    const expiresAt = new Date(startedAt);

    expiresAt.setDate(
      expiresAt.getDate() + pkg.duration_days
    );

    // 1. Create subscription
    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .insert({
          customer_id: id,
          package_id: pkg.id,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          price: pkg.price,
          created_by: user.id,
        })
        .select()
        .single();

    if (subscriptionError || !subscription) {
      console.error(subscriptionError);
      throw new Error("فشل إنشاء الاشتراك");
    }

    // 2. Create charge
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

    // If charge failed, remove subscription
    if (chargeError) {
      console.error(chargeError);

      await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscription.id);

      throw new Error("فشل إنشاء المطالبة المالية");
    }

    redirect(`/customers/${id}`);
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">
          إضافة باقة
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          العميل: {customer.full_name}
        </p>
      </div>

      <form
        action={addPackage}
        className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-6"
      >
        <label className="mb-2 block text-sm font-medium text-slate-300">
          اختر الباقة
        </label>

        <select
          name="package_id"
          required
          className="w-full rounded-xl border border-[#0B4668] bg-[#041F38] px-4 py-3 text-white outline-none focus:border-[#00D9F5]"
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

        <div className="mt-6 rounded-xl border border-[#0B4668] bg-[#041F38] p-4">
          <p className="text-sm text-slate-400">
            عند إضافة الباقة سيتم إنشاء:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>• اشتراك جديد</li>
            <li>• مطالبة مالية بقيمة الباقة</li>
            <li>• مدة الاشتراك حسب مدة الباقة</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#00D9F5] px-6 py-3 font-bold text-[#06294A] transition hover:bg-[#12E8F5]"
          >
            إضافة الباقة
          </button>

          <a
            href={`/customers/${id}`}
            className="rounded-xl border border-[#0B4668] px-6 py-3 font-semibold text-slate-300 hover:bg-[#041F38]"
          >
            إلغاء
          </a>
        </div>
      </form>
    </div>
  );
}