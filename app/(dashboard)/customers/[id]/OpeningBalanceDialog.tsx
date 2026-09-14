"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Wallet,
  Loader2,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Toast = {
  type: "success" | "error";
  message: string;
} | null;

export default function OpeningBalanceDialog({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  function closeDialog() {
    if (saving) return;

    setOpen(false);
    setAmount("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(numericAmount)) {
      setToast({
        type: "error",
        message: "يرجى إدخال مبلغ صحيح",
      });

      return;
    }

    if (numericAmount <= 0) {
      setToast({
        type: "error",
        message: "يجب أن يكون الرصيد أكبر من صفر",
      });

      return;
    }

    setSaving(true);
    setToast(null);

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);

      setToast({
        type: "error",
        message: "انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مجددًا",
      });

      return;
    }

    const finalDescription =
      description.trim() ||
      `رصيد سابق للعميل ${customerName}`;

    const { error } = await supabase.from("charges").insert({
      customer_id: customerId,
      type: "opening_balance",
      amount: numericAmount,
      description: finalDescription,
      subscription_id: null,
      package_id: null,
      created_by: user.id,
    });

    if (error) {
      console.error(error);

      setSaving(false);

      setToast({
        type: "error",
        message: "تعذر إضافة الرصيد السابق",
      });

      return;
    }

    setSaving(false);
    setOpen(false);

    setAmount("");
    setDescription("");

    /*
     * نعيد تحميل الصفحة حتى تظهر:
     * - المستحقات الجديدة
     * - المتبقي الجديد
     * - السجل المالي
     */
    window.location.reload();
  }

  return (
    <>
      {/* Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/5 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:border-orange-300/50 hover:bg-orange-400/10"
      >
        <Wallet size={16} />
        إضافة رصيد سابق
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed left-5 top-5 z-[110] w-[min(380px,calc(100vw-40px))]">
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
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dialog */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              closeDialog();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-orange-400/20 bg-[#06294A] shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-400/10">
                  <Wallet className="h-5 w-5 text-orange-300" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">
                    إضافة رصيد سابق
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    تسجيل مديونية سابقة للعميل
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeDialog}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {/* Customer */}
                <div className="rounded-xl border border-orange-400/10 bg-orange-400/5 p-4">
                  <p className="text-xs text-slate-500">
                    العميل
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {customerName}
                  </p>
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    مبلغ الرصيد السابق
                    <span className="mr-1 text-orange-300">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="مثال: 150000"
                      disabled={saving}
                      autoFocus
                      className="w-full rounded-xl border border-white/10 bg-[#031d35] px-4 py-3 pl-16 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 disabled:opacity-50"
                    />

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                      ل.س
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    هذا المبلغ سيُضاف إلى المستحقات الحالية للعميل.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    ملاحظة
                    <span className="mr-1 text-xs text-slate-600">
                      اختياري
                    </span>
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    disabled={saving}
                    rows={3}
                    placeholder="مثال: مديونية سابقة قبل نقل البيانات إلى HyperNet"
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#031d35] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 disabled:opacity-50"
                  />
                </div>

                {/* Info */}
                <div className="rounded-xl border border-white/10 bg-[#031d35]/60 p-4">
                  <p className="text-xs leading-6 text-slate-400">
                    سيتم تسجيل العملية كسجل مالي مستقل باسم{" "}
                    <span className="font-semibold text-orange-300">
                      رصيد سابق
                    </span>
                    ، ولن يتم ربطها بأي باقة أو اشتراك.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-[#031d35]/40 p-5 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeDialog}
                  className="flex-1 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-[#06294A] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ الحفظ...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      إضافة الرصيد
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}