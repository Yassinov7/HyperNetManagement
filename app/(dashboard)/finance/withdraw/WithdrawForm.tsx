"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownToLine,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Account = {
  id: string;
  label: string;
  balance: number;
  accountType: "company_cash" | "staff_wallet" | "bank";
};

type Props = {
  accounts: Account[];
  today: string;
  isSuperadmin: boolean;
  action: (formData: FormData) => void;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("ar-SY").format(amount);
}

export default function WithdrawForm({
  accounts,
  today,
  isSuperadmin,
  action,
}: Props) {
  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [amount, setAmount] = useState("");

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const availableBalance = selectedAccount?.balance ?? 0;

  const numericAmount = Number(amount);

  const isAmountValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= availableBalance;

  const isOverBalance =
    numericAmount > 0 &&
    numericAmount > availableBalance;

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border border-cyan-400/10 bg-[#071d31] p-6"
    >
      {/* Type */}
      <div>
        <label
          htmlFor="withdrawal_type"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          نوع السحب
        </label>

        <select
          id="withdrawal_type"
          name="withdrawal_type"
          defaultValue="cash_withdrawal"
          required
          className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
        >
          <option value="cash_withdrawal">
            سحب نقدي
          </option>

          {isSuperadmin && (
            <option value="owner_withdrawal">
              سحب شخصي للمالك
            </option>
          )}
        </select>
      </div>

      {/* Account */}
      <div>
        <label
          htmlFor="source_account_id"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          السحب من
        </label>

        <select
          id="source_account_id"
          name="source_account_id"
          required
          value={selectedAccountId}
          onChange={(event) => {
            setSelectedAccountId(event.target.value);
            setAmount("");
          }}
          className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
        >
          <option value="" disabled>
            اختر الصندوق
          </option>

          {accounts.map((account) => (
            <option
              key={account.id}
              value={account.id}
            >
              {account.label} — المتاح{" "}
              {formatMoney(account.balance)} ل.س
            </option>
          ))}
        </select>

        {selectedAccount && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-400/10 bg-[#061728] px-4 py-3">
            <span className="text-sm text-slate-400">
              الرصيد المتاح
            </span>

            <span className="font-bold text-cyan-400">
              {formatMoney(availableBalance)} ل.س
            </span>
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-slate-300"
          >
            مبلغ السحب
          </label>

          {selectedAccount && (
            <button
              type="button"
              onClick={() =>
                setAmount(String(availableBalance))
              }
              disabled={availableBalance <= 0}
              className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              استخدام كامل الرصيد
            </button>
          )}
        </div>

        <div className="relative">
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            max={
              selectedAccount
                ? availableBalance
                : undefined
            }
            step="1"
            required
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder={
              selectedAccount
                ? `الحد الأقصى ${formatMoney(
                    availableBalance
                  )}`
                : "اختر الصندوق أولًا"
            }
            disabled={!selectedAccount}
            className={`w-full rounded-xl border bg-[#061728] px-4 py-3 pl-16 text-sm text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 ${
              isOverBalance
                ? "border-red-400/50 focus:border-red-400"
                : "border-white/10 focus:border-cyan-400/50"
            }`}
          />

          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            ل.س
          </span>
        </div>

        {!selectedAccount && (
          <p className="mt-2 text-xs text-slate-500">
            اختر الصندوق أولًا لمعرفة الحد الأقصى للسحب.
          </p>
        )}

        {selectedAccount && !isOverBalance && (
          <p className="mt-2 text-xs text-slate-500">
            الحد الأقصى للسحب:{" "}
            <span className="text-cyan-400">
              {formatMoney(availableBalance)} ل.س
            </span>
          </p>
        )}

        {isOverBalance && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

            <div>
              <p className="text-sm font-medium text-red-300">
                المبلغ أكبر من الرصيد المتاح
              </p>

              <p className="mt-1 text-xs leading-5 text-red-200/60">
                المتاح في الصندوق:{" "}
                <span className="font-semibold text-red-300">
                  {formatMoney(availableBalance)} ل.س
                </span>
              </p>
            </div>
          </div>
        )}

        {isAmountValid && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            المبلغ ضمن الرصيد المتاح
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="transaction_date"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          تاريخ السحب
        </label>

        <input
          id="transaction_date"
          name="transaction_date"
          type="date"
          defaultValue={today}
          required
          className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          الوصف
        </label>

        <input
          id="description"
          name="description"
          type="text"
          placeholder="مثال: سحب نقدي للمصاريف اليومية"
          className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
        />
      </div>

      {/* Reference */}
      <div>
        <label
          htmlFor="reference"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          المرجع
        </label>

        <input
          id="reference"
          name="reference"
          type="text"
          placeholder="اختياري"
          className="w-full rounded-xl border border-white/10 bg-[#061728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
        />
      </div>

      {/* Summary */}
      {selectedAccount && (
        <div className="rounded-xl border border-cyan-400/10 bg-[#061728] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              الصندوق
            </span>

            <span className="font-medium text-white">
              {selectedAccount.label}
            </span>
          </div>

          <div className="my-3 h-px bg-white/5" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              الرصيد قبل السحب
            </span>

            <span className="font-medium text-cyan-400">
              {formatMoney(availableBalance)} ل.س
            </span>
          </div>

          <div className="my-3 h-px bg-white/5" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              الرصيد بعد السحب
            </span>

            <span
              className={
                isAmountValid
                  ? "font-bold text-white"
                  : "font-bold text-slate-500"
              }
            >
              {isAmountValid
                ? `${formatMoney(
                    availableBalance - numericAmount
                  )} ل.س`
                : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/finance"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          إلغاء
        </Link>

        <button
          type="submit"
          disabled={!selectedAccount || !isAmountValid}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#031321] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDownToLine className="h-4 w-4" />
          تسجيل السحب
        </button>
      </div>
    </form>
  );
}