import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select(`
      id,
      full_name,
      username,
      phone,
      tower,
      status,
      notes
    `)
    .eq("id", id)
    .single();

  if (error || !customer) {
    redirect("/customers");
  }

  async function updateCustomer(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const fullName = String(formData.get("full_name") || "").trim();
    const username = String(formData.get("username") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const tower = String(formData.get("tower") || "").trim();
    const status = String(formData.get("status") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!fullName) {
      throw new Error("اسم العميل مطلوب");
    }

    if (!["active", "inactive", "suspended"].includes(status)) {
      throw new Error("حالة العميل غير صحيحة");
    }

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: fullName,
        username: username || null,
        phone: phone || null,
        tower: tower || null,
        status,
        notes: notes || null,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/customers/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      {/* Back */}
      <Link
        href={`/customers/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-400"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى ملف العميل
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">تعديل بيانات العميل</h1>

        <p className="mt-1 text-sm text-slate-400">
          تعديل معلومات العميل وحالته
        </p>
      </div>

      {/* Form */}
      <form
        action={updateCustomer}
        className="space-y-6 rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6 shadow-xl"
      >
        {/* Full name */}
        <div>
          <label
            htmlFor="full_name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            اسم العميل
          </label>

          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={customer.full_name}
            required
            placeholder="مثال: أحمد محمد"
            className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>

        {/* Username + Phone */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              اسم المستخدم
            </label>

            <input
              id="username"
              name="username"
              type="text"
              defaultValue={customer.username ?? ""}
              placeholder="مثال: ahmad123"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              رقم الهاتف
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={customer.phone ?? ""}
              placeholder="مثال: 09xxxxxxxx"
              dir="ltr"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
        </div>

        {/* Tower + Status */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="tower"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              البرج
            </label>

            <input
              id="tower"
              name="tower"
              type="text"
              defaultValue={customer.tower ?? ""}
              placeholder="مثال: Tower 01"
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              حالة العميل
            </label>

            <select
              id="status"
              name="status"
              defaultValue={customer.status}
              required
              className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            ملاحظات
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={customer.notes ?? ""}
            placeholder="أضف أي ملاحظات عن العميل..."
            className="w-full resize-none rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row">
          <Link
            href={`/customers/${id}`}
            className="flex flex-1 items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            إلغاء
          </Link>

          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            <Save className="h-4 w-4" />
            حفظ التعديلات
          </button>
        </div>
      </form>
    </div>
  );
}