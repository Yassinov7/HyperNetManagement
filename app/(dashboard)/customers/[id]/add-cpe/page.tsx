import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AddCPEPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name")
    .eq("id", id)
    .single();

  if (!customer) {
    redirect("/customers");
  }

  async function addCPE(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const ownershipType = formData.get(
      "ownership_type"
    ) as "company" | "sold";

    const notes = formData.get("notes") as string;

    const { error } = await supabase
      .from("cpes")
      .insert({
        customer_id: id,
        ownership_type: ownershipType,
        notes: notes?.trim() || null,
      });

    if (error) {
      console.error(error);
      throw new Error("فشل إضافة الجهاز");
    }

    redirect(`/customers/${id}`);
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">
          إضافة جهاز CPE
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          العميل: {customer.full_name}
        </p>
      </div>

      <form
        action={addCPE}
        className="rounded-2xl border border-[#0B4668] bg-[#06294A] p-6"
      >

        <label className="mb-2 block text-sm text-slate-300">
          نوع الملكية
        </label>

        <select
          name="ownership_type"
          defaultValue="company"
          className="w-full rounded-xl border border-[#0B4668] bg-[#041F38] px-4 py-3 text-white outline-none focus:border-[#00D9F5]"
        >
          <option value="company">
            ملك الشركة
          </option>

          <option value="sold">
            مباع للعميل
          </option>
        </select>

        <label className="mb-2 mt-5 block text-sm text-slate-300">
          ملاحظات
        </label>

        <textarea
          name="notes"
          rows={4}
          placeholder="موديل الجهاز، MAC، موقع التركيب..."
          className="w-full resize-none rounded-xl border border-[#0B4668] bg-[#041F38] px-4 py-3 text-white outline-none focus:border-[#00D9F5]"
        />

        <div className="mt-6 flex gap-3">

          <button
            type="submit"
            className="rounded-xl bg-[#00D9F5] px-6 py-3 font-bold text-[#06294A]"
          >
            حفظ الجهاز
          </button>

          <a
            href={`/customers/${id}`}
            className="rounded-xl border border-[#0B4668] px-6 py-3 text-slate-300"
          >
            إلغاء
          </a>

        </div>

      </form>
    </div>
  );
}