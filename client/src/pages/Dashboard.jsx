import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Active Session Role: <span className="font-semibold text-blue-600">{user?.role}</span>
              {user?.judge && ` • Assigned to ${user.judge.courtroom} (Daily Capacity: ${user.judge.dailyCapacity})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              ● System Online
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder Notice for Day 2 */}
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
        <span className="text-3xl">📊</span>
        <h3 className="text-lg font-bold text-slate-800 mt-2">
          Judicial Analytics & Performance Dashboard
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
          Full Recharts visualizations (case age distribution across FAST, STANDARD, COMPLEX tracks, disposal rates, and tomorrow's listings) will activate on Day 7.
        </p>
      </div>
    </div>
  );
}

