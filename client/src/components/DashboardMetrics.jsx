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
            className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between">
        <div>
          <p className="font-semibold">Unable to load metrics</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
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
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pending
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 text-lg">📁</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.totalPending ?? 0}
            </span>
            <span className="text-xs text-slate-400">cases awaiting trial</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Active filings awaiting or undergoing differentiated track management.
          </p>
        </div>

        {/* Overdue Cases Card */}
        <div className="p-6 bg-white border border-rose-200 rounded-xl shadow-sm hover:border-rose-300 transition bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Overdue Cases
            </span>
            <span className="p-2 rounded-lg bg-rose-100 text-rose-700 text-lg">⚠️</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">
              {stats?.overdueCases ?? 0}
            </span>
            <span className="text-xs text-rose-500 font-semibold">past statutory limit</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Matters exceeding target disposal date (FAST: 90d, STD: 365d, CPLX: 730d).
          </p>
        </div>

        {/* Average Age Card */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Age
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600 text-lg">⏳</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.averageAge ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">calendar days</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Mean days since filing date across all active court matters.
          </p>
        </div>
      </div>
    </div>
  );
}

