import React, { useState, useEffect } from "react";
import api from "../api.js";

export default function DashboardMetrics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/dashboard/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-3"
          >
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            <div className="h-7 bg-slate-200/70 rounded w-1/4"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl text-sm text-rose-800 flex items-center justify-between">
        <div>
          <p className="font-semibold text-rose-900">Unable to load metrics</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Pending Card */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Pending
            </span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600 text-xs font-medium ring-1 ring-inset ring-blue-600/20">
              📁
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats?.totalPending ?? 0}
            </span>
            <span className="text-xs text-slate-400">cases awaiting trial</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Active filings awaiting or undergoing differentiated track management.
          </p>
        </div>

        {/* Overdue Cases Card */}
        <div className="p-5 bg-white border border-rose-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-rose-300 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
              Overdue Cases
            </span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-rose-50 text-rose-700 text-xs font-medium ring-1 ring-inset ring-rose-600/20">
              ⚠️
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-600 tabular-nums">
              {stats?.overdueCases ?? 0}
            </span>
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
              past target
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Matters exceeding target disposal date (FAST: 90d, STD: 365d, CPLX: 730d).
          </p>
        </div>

        {/* Average Age Card */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Average Age
            </span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-50 text-amber-700 text-xs font-medium ring-1 ring-inset ring-amber-600/20">
              ⏳
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats?.averageAge ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">calendar days</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Mean days elapsed since initial filing date across all active court matters.
          </p>
        </div>
      </div>
    </div>
  );
}
