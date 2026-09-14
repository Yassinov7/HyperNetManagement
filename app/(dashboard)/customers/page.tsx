"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Eye,
  Pencil,
  Ban,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  tower: string | null;
  status: "active" | "inactive" | "suspended";
  notes: string | null;
};

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

const statusLabels = {
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};

export default function CustomersPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(
    null
  );

  const [statusDialog, setStatusDialog] = useState<{
    customer: Customer;
    newStatus: Customer["status"];
  } | null>(null);

  const [toast, setToast] = useState<Toast>(null);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    phone: "",
    tower: "",
    status: "active" as Customer["status"],
    notes: "",
  });

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  async function loadCustomers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      setToast({
        type: "error",
        message: "تعذر تحميل قائمة العملاء",
      });

      setLoading(false);
      return;
    }

    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) =>
      [
        customer.full_name,
        customer.username,
        customer.phone,
        customer.tower,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalCustomers = customers.length;

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active"
  ).length;

  const suspendedCustomers = customers.filter(
    (customer) => customer.status === "suspended"
  ).length;

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim()) {
      setToast({
        type: "error",
        message: "يرجى إدخال اسم العميل",
      });

      return;
    }

    const { error } = await supabase.from("customers").insert({
      full_name: form.full_name.trim(),
      username: form.username.trim() || null,
      phone: form.phone.trim() || null,
      tower: form.tower.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    });

    if (error) {
      console.error(error);

      setToast({
        type: "error",
        message: "حدث خطأ أثناء إضافة العميل",
      });

      return;
    }

    setForm({
      full_name: "",
      username: "",
      phone: "",
      tower: "",
      status: "active",
      notes: "",
    });

    setShowForm(false);

    setToast({
      type: "success",
      message: "تمت إضافة العميل بنجاح",
    });

    await loadCustomers();
  }

  function openStatusDialog(
    customer: Customer,
    newStatus: Customer["status"]
  ) {
    setStatusDialog({
      customer,
      newStatus,
    });
  }

  function closeStatusDialog() {
    if (updatingCustomerId) return;

    setStatusDialog(null);
  }

  async function handleChangeStatus() {
    if (!statusDialog) return;

    const { customer, newStatus } = statusDialog;

    setUpdatingCustomerId(customer.id);

    const { error } = await supabase
      .from("customers")
      .update({
        status: newStatus,
      })
      .eq("id", customer.id);

    if (error) {
      console.error(error);

      setUpdatingCustomerId(null);
      setStatusDialog(null);

      setToast({
        type: "error",
        message:
          newStatus === "suspended"
            ? "تعذر إيقاف العميل"
            : "تعذر إعادة تفعيل العميل",
      });

      return;
    }

    setCustomers((currentCustomers) =>
      currentCustomers.map((item) =>
        item.id === customer.id
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );

    setUpdatingCustomerId(null);
    setStatusDialog(null);

    setToast({
      type: "success",
      message:
        newStatus === "suspended"
          ? `تم إيقاف العميل "${customer.full_name}"`
          : `تمت إعادة تفعيل العميل "${customer.full_name}"`,
    });
  }

  const isSuspending = statusDialog?.newStatus === "suspended";

  return (
    <div dir="rtl" className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed left-5 top-5 z-[100] w-[min(380px,calc(100vw-40px))]">
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-cyan-400/30 bg-[#06294A]/95"
                : "border-red-400/30 bg-[#35131a]/95"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" ? (
                <CircleCheck className="h-5 w-5 text-cyan-300" />
              ) : (
                <CircleX className="h-5 w-5 text-red-300" />
              )}
            </div>

            <p
              className={`flex-1 text-sm leading-6 ${
                toast.type === "success"
                  ? "text-cyan-50"
                  : "text-red-100"
              }`}
            >
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-cyan-300">
            <Users className="h-4 w-4" />
            <span>إدارة العملاء</span>
          </div>

          <h1 className="text-2xl font-bold text-white md:text-3xl">
            العملاء
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            إدارة العملاء وحالات الاشتراك الخاصة بهم
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#06294A] shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
        >
          <Plus className="h-5 w-5" />
          إضافة عميل
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#06294A]/70 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">إجمالي العملاء</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {totalCustomers}
              </p>
            </div>

            <div className="rounded-xl bg-cyan-400/10 p-3">
              <Users className="h-6 w-6 text-cyan-300" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#06294A]/70 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">العملاء النشطون</p>
              <p className="mt-2 text-3xl font-bold text-cyan-300">
                {activeCustomers}
              </p>
            </div>

            <div className="rounded-xl bg-cyan-400/10 p-3">
              <CircleCheck className="h-6 w-6 text-cyan-300" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#06294A]/70 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">العملاء الموقوفون</p>
              <p className="mt-2 text-3xl font-bold text-red-300">
                {suspendedCustomers}
              </p>
            </div>

            <div className="rounded-xl bg-red-400/10 p-3">
              <Ban className="h-6 w-6 text-red-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-white/10 bg-[#06294A]/70 p-4 shadow-xl shadow-black/10">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف أو البرج..."
            className="w-full rounded-xl border border-white/10 bg-[#031d35] py-3 pr-12 pl-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
          />
        </div>
      </div>

      {/* Customers table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06294A]/70 shadow-xl shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right">
            <thead className="border-b border-white/10 bg-[#031d35]/60">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  العميل
                </th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  اسم المستخدم
                </th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  الهاتف
                </th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  البرج
                </th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  الحالة
                </th>
                <th className="px-5 py-4 text-xs font-semibold text-slate-400">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
                      <span className="text-sm">
                        جارٍ تحميل العملاء...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center">
                      <div className="rounded-2xl bg-white/5 p-4">
                        <Users className="h-8 w-8 text-slate-500" />
                      </div>

                      <p className="mt-4 text-sm font-medium text-slate-300">
                        لا يوجد عملاء
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {search
                          ? "لم يتم العثور على نتائج مطابقة للبحث"
                          : "ابدأ بإضافة أول عميل إلى النظام"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isUpdating =
                    updatingCustomerId === customer.id;

                  return (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-white">
                            {customer.full_name}
                          </p>

                          {customer.notes && (
                            <p className="mt-1 max-w-[250px] truncate text-xs text-slate-500">
                              {customer.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {customer.username || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {customer.tower || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            customer.status === "active"
                              ? "bg-cyan-400/10 text-cyan-300"
                              : customer.status === "suspended"
                                ? "bg-red-400/10 text-red-300"
                                : "bg-slate-400/10 text-slate-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              customer.status === "active"
                                ? "bg-cyan-300"
                                : customer.status === "suspended"
                                  ? "bg-red-300"
                                  : "bg-slate-400"
                            }`}
                          />

                          {statusLabels[customer.status]}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${customer.id}`}
                            title="عرض العميل"
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/customers/${customer.id}/edit`}
                            title="تعديل العميل"
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          {customer.status === "active" ? (
                            <button
                              type="button"
                              title="إيقاف العميل"
                              disabled={isUpdating}
                              onClick={() =>
                                openStatusDialog(
                                  customer,
                                  "suspended"
                                )
                              }
                              className="rounded-lg border border-red-400/10 bg-red-400/5 p-2 text-red-300 transition hover:border-red-400/30 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="إعادة تفعيل العميل"
                              disabled={isUpdating}
                              onClick={() =>
                                openStatusDialog(
                                  customer,
                                  "active"
                                )
                              }
                              className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add customer dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-400/10 bg-[#06294A] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white">
                  إضافة عميل جديد
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  أدخل بيانات العميل الأساسية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer}>
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field
                  label="اسم العميل"
                  required
                  value={form.full_name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      full_name: value,
                    }))
                  }
                  placeholder="مثال: أحمد محمد"
                />

                <Field
                  label="اسم المستخدم"
                  value={form.username}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      username: value,
                    }))
                  }
                  placeholder="مثال: ahmad123"
                />

                <Field
                  label="رقم الهاتف"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                  placeholder="مثال: 09xxxxxxxx"
                />

                <Field
                  label="البرج"
                  value={form.tower}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      tower: value,
                    }))
                  }
                  placeholder="اسم البرج"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    الحالة
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status: e.target.value as Customer["status"],
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#031d35] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="suspended">موقوف</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    ملاحظات
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        notes: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#031d35] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-[#031d35]/40 px-6 py-4 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#06294A] transition hover:bg-cyan-300"
                >
                  إضافة العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status confirmation dialog */}
      {statusDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !updatingCustomerId) {
              closeStatusDialog();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#06294A] shadow-2xl shadow-black/50">
            <div className="p-6">
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                  isSuspending
                    ? "bg-red-400/10 text-red-300"
                    : "bg-cyan-400/10 text-cyan-300"
                }`}
              >
                {isSuspending ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <CheckCircle2 className="h-7 w-7" />
                )}
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-xl font-bold text-white">
                  {isSuspending
                    ? "إيقاف العميل؟"
                    : "إعادة تفعيل العميل؟"}
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {isSuspending ? (
                    <>
                      أنت على وشك إيقاف العميل{" "}
                      <span className="font-bold text-white">
                        {statusDialog.customer.full_name}
                      </span>
                      .
                      <br />
                      لن يتم حذف العميل أو أي من سجلاته المالية
                      والاشتراكات السابقة.
                    </>
                  ) : (
                    <>
                      هل تريد إعادة تفعيل العميل{" "}
                      <span className="font-bold text-white">
                        {statusDialog.customer.full_name}
                      </span>
                      ؟
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-[#031d35]/40 p-5 sm:flex-row">
              <button
                type="button"
                disabled={!!updatingCustomerId}
                onClick={closeStatusDialog}
                className="flex-1 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={!!updatingCustomerId}
                onClick={handleChangeStatus}
                className={`flex-1 rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSuspending
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-cyan-400 text-[#06294A] hover:bg-cyan-300"
                }`}
              >
                {updatingCustomerId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التنفيذ...
                  </span>
                ) : isSuspending ? (
                  "نعم، إيقاف العميل"
                ) : (
                  "نعم، إعادة التفعيل"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="mr-1 text-cyan-300">*</span>}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#031d35] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
      />
    </div>
  );
}