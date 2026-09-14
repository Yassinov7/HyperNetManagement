"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export default function AdminsPage() {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAdmins(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        is_active,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: true });

    if (!error) {
      setProfiles(data ?? []);
    } else {
      console.error(error);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const name = profile.full_name?.toLowerCase() ?? "";
      const username = profile.username?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        name.includes(query) ||
        username.includes(query);

      const matchesStatus =
        status === "all" ||
        (status === "active" && profile.is_active) ||
        (status === "inactive" && !profile.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [profiles, search, status]);

  const activeAdmins = profiles.filter(
    (profile) => profile.is_active
  ).length;

  const inactiveAdmins = profiles.filter(
    (profile) => !profile.is_active
  ).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                المسؤولون
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                إدارة حسابات مسؤولي نظام HyperNet
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadAdmins(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#071d31] px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-400 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          تحديث
        </button>
      </div>

      {/* Permission notice */}
      <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
        <div className="flex gap-4">
          <div className="mt-0.5 rounded-lg bg-cyan-400/10 p-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>

          <div>
            <h2 className="font-semibold text-white">
              صلاحيات المسؤولين
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              جميع حسابات المسؤولين في الإصدار الحالي تعمل بنفس مستوى
              الصلاحيات. لا يوجد نظام أدوار أو مسؤول مخصص للعميل.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              إجمالي المسؤولين
            </span>

            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {profiles.length}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              حسابات نشطة
            </span>

            <UserCheck className="h-5 w-5 text-cyan-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-cyan-400">
            {activeAdmins}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#071d31] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              حسابات غير نشطة
            </span>

            <UserX className="h-5 w-5 text-slate-500" />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-300">
            {inactiveAdmins}
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
              placeholder="بحث بالاسم أو اسم المستخدم..."
              className="w-full rounded-xl border border-slate-700 bg-[#061625] py-3 pl-4 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#061625] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="all">كل الحسابات</option>
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </select>
        </div>
      </div>

      {/* Admin table */}
      <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-[#071d31]">
        <div className="border-b border-slate-800 px-6 py-5">
          <h2 className="font-bold text-white">
            قائمة المسؤولين

            <span className="mr-2 text-sm font-normal text-slate-500">
              ({filteredProfiles.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            جاري تحميل المسؤولين...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            لا توجد حسابات مطابقة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">
                    المسؤول
                  </th>

                  <th className="px-6 py-4 font-medium">
                    اسم المستخدم
                  </th>

                  <th className="px-6 py-4 font-medium">
                    الصلاحية
                  </th>

                  <th className="px-6 py-4 font-medium">
                    الحالة
                  </th>

                  <th className="px-6 py-4 font-medium">
                    تاريخ الإنشاء
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-slate-800/70 transition hover:bg-cyan-400/[0.03]"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-400">
                          {(profile.full_name ||
                            "H")[0].toUpperCase()}
                        </div>

                        <div>
                          <p className="font-medium text-white">
                            {profile.full_name ||
                              "HyperNet User"}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            ID: {profile.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-400">
                      {profile.username
                        ? `@${profile.username}`
                        : "—"}
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        مسؤول
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          غير نشط
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-400">
                      {formatDate(profile.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}