"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CPE = {
  id: string;
  customer_id: string;
  ownership_type: "company" | "sold";
  notes: string | null;
  created_at: string;
  customer: {
    full_name: string;
    username: string | null;
    tower: string | null;
  } | null;
};

type Customer = {
  id: string;
  full_name: string;
  username: string | null;
};

export default function CpesPage() {
  const supabase = createClient();

  const [cpes, setCpes] = useState<CPE[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");
  const [ownership, setOwnership] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingCpe, setEditingCpe] = useState<CPE | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [ownershipType, setOwnershipType] =
    useState<"company" | "sold">("company");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const [{ data: cpeData }, { data: customerData }] = await Promise.all([
      supabase
        .from("cpes")
        .select(`
          id,
          customer_id,
          ownership_type,
          notes,
          created_at,
          customer:customers (
            full_name,
            username,
            tower
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("customers")
        .select("id, full_name, username")
        .order("full_name"),
    ]);

    setCpes((cpeData as unknown as CPE[]) ?? []);
    setCustomers(customerData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setEditingCpe(null);
    setCustomerId("");
    setOwnershipType("company");
    setNotes("");
    setShowModal(true);
  }

  function openEditModal(cpe: CPE) {
    setEditingCpe(cpe);
    setCustomerId(cpe.customer_id);
    setOwnershipType(cpe.ownership_type);
    setNotes(cpe.notes ?? "");
    setShowModal(true);
  }

  async function saveCpe() {
    if (!customerId) {
      alert("يرجى اختيار العميل");
      return;
    }

    setSaving(true);

    if (editingCpe) {
      const { error } = await supabase
        .from("cpes")
        .update({
          customer_id: customerId,
          ownership_type: ownershipType,
          notes: notes.trim() || null,
        })
        .eq("id", editingCpe.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("cpes").insert({
        customer_id: customerId,
        ownership_type: ownershipType,
        notes: notes.trim() || null,
      });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    await loadData();
  }

  async function deleteCpe(cpe: CPE) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف جهاز CPE الخاص بالعميل "${cpe.customer?.full_name ?? ""}"؟`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("cpes")
      .delete()
      .eq("id", cpe.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  const filteredCpes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cpes.filter((cpe) => {
      const customerName = cpe.customer?.full_name?.toLowerCase() ?? "";
      const username = cpe.customer?.username?.toLowerCase() ?? "";
      const tower = cpe.customer?.tower?.toLowerCase() ?? "";
      const cpeNotes = cpe.notes?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        customerName.includes(query) ||
        username.includes(query) ||
        tower.includes(query) ||
        cpeNotes.includes(query);

      const matchesOwnership =
        ownership === "all" || cpe.ownership_type === ownership;

      return matchesSearch && matchesOwnership;
    });
  }, [cpes, search, ownership]);

  const companyCount = cpes.filter(
    (cpe) => cpe.ownership_type === "company"
  ).length;

  const soldCount = cpes.filter(
    (cpe) => cpe.ownership_type === "sold"
  ).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">أجهزة CPE</h1>
          <p className="mt-1 text-sm text-slate-400">
            إدارة أجهزة العملاء وملكية الأجهزة
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          <Plus className="h-4 w-4" />
          إضافة CPE
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">إجمالي الأجهزة</span>
            <Cpu className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {cpes.length}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">أجهزة الشركة</span>
            <Building2 className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {companyCount}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">أجهزة مباعة</span>
            <UserRound className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-2xl font-bold text-white">
            {soldCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل أو المستخدم أو البرج..."
              className="w-full rounded-xl border border-slate-700 bg-[#061625] py-3 pl-4 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <select
            value={ownership}
            onChange={(e) => setOwnership(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">كل الملكيات</option>
            <option value="company">ملك الشركة</option>
            <option value="sold">مباع للعميل</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-[#071d31]">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            قائمة الأجهزة
            <span className="mr-2 text-sm font-normal text-slate-500">
              ({filteredCpes.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            جاري تحميل الأجهزة...
          </div>
        ) : filteredCpes.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            لا توجد أجهزة مطابقة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-right">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-500">
                  <th className="px-5 py-4 font-medium">العميل</th>
                  <th className="px-5 py-4 font-medium">البرج</th>
                  <th className="px-5 py-4 font-medium">الملكية</th>
                  <th className="px-5 py-4 font-medium">الملاحظات</th>
                  <th className="px-5 py-4 font-medium">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredCpes.map((cpe) => (
                  <tr
                    key={cpe.id}
                    className="border-b border-slate-800/70 hover:bg-cyan-400/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${cpe.customer_id}`}
                        className="font-medium text-white hover:text-cyan-400"
                      >
                        {cpe.customer?.full_name ?? "عميل غير معروف"}
                      </Link>

                      {cpe.customer?.username && (
                        <p className="mt-1 text-xs text-slate-500">
                          @{cpe.customer.username}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-400">
                      {cpe.customer?.tower || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {cpe.ownership_type === "company" ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
                          <Building2 className="h-3.5 w-3.5" />
                          ملك الشركة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300">
                          <UserRound className="h-3.5 w-3.5" />
                          مباع
                        </span>
                      )}
                    </td>

                    <td className="max-w-[250px] truncate px-5 py-4 text-sm text-slate-500">
                      {cpe.notes || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(cpe)}
                          className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-400"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => deleteCpe(cpe)}
                          className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-red-400/30 hover:text-red-400"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-400/10 bg-[#071d31] shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-5">
              <h2 className="text-lg font-bold text-white">
                {editingCpe ? "تعديل CPE" : "إضافة CPE"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ربط الجهاز بعميل وتحديد نوع الملكية
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  العميل
                </label>

                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">اختر العميل</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                      {customer.username
                        ? ` — @${customer.username}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  الملكية
                </label>

                <select
                  value={ownershipType}
                  onChange={(e) =>
                    setOwnershipType(
                      e.target.value as "company" | "sold"
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="company">ملك الشركة</option>
                  <option value="sold">مباع للعميل</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  ملاحظات
                </label>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="ملاحظات عن الجهاز..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveCpe}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingCpe
                      ? "حفظ التعديلات"
                      : "إضافة الجهاز"}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-slate-300 transition hover:bg-slate-800"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}