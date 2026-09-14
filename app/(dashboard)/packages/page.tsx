"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PackageRow = {
  id: string;
  name: string;
  type: "limited" | "unlimited";
  speed_mbps: number;
  data_limit_gb: number | null;
  price: number;
  duration_days: number;
  description: string | null;
  is_active: boolean;
};

const emptyForm = {
  name: "",
  type: "limited" as "limited" | "unlimited",
  speed_mbps: "",
  data_limit_gb: "",
  price: "",
  duration_days: "30",
  description: "",
};

export default function PackagesPage() {
  const supabase = createClient();

  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadPackages() {
    setLoading(true);

    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("type")
      .order("price");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setPackages(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(pkg: PackageRow) {
    setEditingId(pkg.id);

    setForm({
      name: pkg.name,
      type: pkg.type,
      speed_mbps: String(pkg.speed_mbps),
      data_limit_gb: pkg.data_limit_gb
        ? String(pkg.data_limit_gb)
        : "",
      price: String(pkg.price),
      duration_days: String(pkg.duration_days),
      description: pkg.description ?? "",
    });

    setShowForm(true);
  }

  async function savePackage(e: React.FormEvent) {
    e.preventDefault();

    const speed = Number(form.speed_mbps);
    const price = Number(form.price);
    const duration = Number(form.duration_days);

    if (!form.name.trim() || speed <= 0 || price <= 0 || duration <= 0) {
      alert("يرجى إدخال بيانات صحيحة");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      speed_mbps: speed,
      data_limit_gb:
        form.type === "limited"
          ? Number(form.data_limit_gb)
          : null,
      price,
      duration_days: duration,
      description: form.description.trim() || null,
    };

    if (
      form.type === "limited" &&
      (!payload.data_limit_gb || payload.data_limit_gb <= 0)
    ) {
      alert("يرجى إدخال حجم البيانات");
      return;
    }

    let error;

    if (editingId) {
      ({ error } = await supabase
        .from("packages")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("packages")
        .insert(payload));
    }

    if (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ الباقة");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);

    await loadPackages();
  }

  async function togglePackage(pkg: PackageRow) {
    const { error } = await supabase
      .from("packages")
      .update({
        is_active: !pkg.is_active,
      })
      .eq("id", pkg.id);

    if (error) {
      console.error(error);
      alert("تعذر تغيير حالة الباقة");
      return;
    }

    await loadPackages();
  }

  const limitedPackages = packages.filter(
    (pkg) => pkg.type === "limited"
  );

  const unlimitedPackages = packages.filter(
    (pkg) => pkg.type === "unlimited"
  );

  return (
    <div dir="rtl" className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-white">
            الباقات
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            إدارة باقات الإنترنت والأسعار
          </p>
        </div>

        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D9F5] px-5 py-3 font-bold text-[#06294A] hover:bg-[#12E8F5]"
        >
          <Plus size={19} />
          إضافة باقة
        </button>

      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">

        <Summary
          label="إجمالي الباقات"
          value={packages.length}
        />

        <Summary
          label="الباقات المحدودة"
          value={limitedPackages.length}
        />

        <Summary
          label="الباقات غير المحدودة"
          value={unlimitedPackages.length}
        />

      </div>

      {/* Limited */}
      <PackageSection
        title="الباقات المحدودة"
        packages={limitedPackages}
        loading={loading}
        onEdit={openEdit}
        onToggle={togglePackage}
      />

      {/* Unlimited */}
      <PackageSection
        title="الباقات غير المحدودة"
        packages={unlimitedPackages}
        loading={loading}
        onEdit={openEdit}
        onToggle={togglePackage}
      />

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#0B4668] bg-[#06294A]">

            <div className="border-b border-[#0B4668] p-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "تعديل الباقة" : "إضافة باقة"}
              </h2>
            </div>

            <form
              onSubmit={savePackage}
              className="space-y-5 p-6"
            >

              <Field
                label="اسم الباقة"
                value={form.name}
                onChange={(value) =>
                  setForm({ ...form, name: value })
                }
                placeholder="مثال: 100GB"
              />

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  نوع الباقة
                </label>

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as
                        | "limited"
                        | "unlimited",
                    })
                  }
                  className={inputClass}
                >
                  <option value="limited">محدودة</option>
                  <option value="unlimited">غير محدودة</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <Field
                  label="السرعة Mbps"
                  type="number"
                  value={form.speed_mbps}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      speed_mbps: value,
                    })
                  }
                />

                {form.type === "limited" && (
                  <Field
                    label="حجم البيانات GB"
                    type="number"
                    value={form.data_limit_gb}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        data_limit_gb: value,
                      })
                    }
                  />
                )}

                <Field
                  label="السعر ل.س"
                  type="number"
                  value={form.price}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      price: value,
                    })
                  }
                />

                <Field
                  label="المدة بالأيام"
                  type="number"
                  value={form.duration_days}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      duration_days: value,
                    })
                  }
                />

              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  الوصف
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="وصف اختياري..."
                />
              </div>

              <div className="flex gap-3 pt-2">

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#00D9F5] px-5 py-3 font-bold text-[#06294A]"
                >
                  {editingId ? "حفظ التعديلات" : "إضافة الباقة"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#0B4668] px-6 py-3 text-slate-300 hover:bg-[#041F38]"
                >
                  إلغاء
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

function PackageSection({
  title,
  packages,
  loading,
  onEdit,
  onToggle,
}: {
  title: string;
  packages: PackageRow[];
  loading: boolean;
  onEdit: (pkg: PackageRow) => void;
  onToggle: (pkg: PackageRow) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#0B4668] bg-[#06294A]/70">

      <div className="flex items-center gap-3 border-b border-[#0B4668] p-5">
        <Package
          size={20}
          className="text-[#00D9F5]"
        />

        <h2 className="font-bold text-white">
          {title}
        </h2>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400">
          جاري التحميل...
        </div>
      ) : packages.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد باقات
        </div>
      ) : (
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">

          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-2xl border p-5 transition ${
                pkg.is_active
                  ? "border-[#0B4668] bg-[#041F38]"
                  : "border-red-900/40 bg-[#041F38]/50 opacity-60"
              }`}
            >

              <div className="flex items-start justify-between">

                <div>
                  <h3 className="text-lg font-bold text-white">
                    {pkg.name}
                  </h3>

                  <p className="mt-1 text-sm text-[#00D9F5]">
                    {pkg.speed_mbps} Mbps
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    pkg.is_active
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-red-400/10 text-red-300"
                  }`}
                >
                  {pkg.is_active ? "فعال" : "متوقف"}
                </span>

              </div>

              <div className="mt-5 space-y-3">

                {pkg.type === "limited" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      البيانات
                    </span>

                    <span className="font-semibold text-white">
                      {pkg.data_limit_gb} GB
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    المدة
                  </span>

                  <span className="font-semibold text-white">
                    {pkg.duration_days} يوم
                  </span>
                </div>

                <div className="border-t border-[#0B4668] pt-3">

                  <span className="text-2xl font-bold text-white">
                    {Number(pkg.price).toLocaleString()}
                  </span>

                  <span className="mr-1 text-sm text-slate-500">
                    ل.س
                  </span>

                </div>

              </div>

              {pkg.description && (
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {pkg.description}
                </p>
              )}

              <div className="mt-5 flex gap-2">

                <button
                  onClick={() => onEdit(pkg)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#0B4668] py-2 text-sm text-slate-300 hover:border-[#00D9F5] hover:text-[#00D9F5]"
                >
                  <Pencil size={15} />
                  تعديل
                </button>

                <button
                  onClick={() => onToggle(pkg)}
                  className="rounded-lg border border-[#0B4668] px-3 text-slate-400 hover:text-white"
                  title={pkg.is_active ? "إيقاف" : "تفعيل"}
                >
                  <Power size={16} />
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </section>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#0B4668] bg-[#06294A]/70 p-5">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className={inputClass}
      />
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#0B4668] bg-[#041F38] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#00D9F5]";