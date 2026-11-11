import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardMetrics from "../components/DashboardMetrics.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
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

      {/* Caseload Performance Metrics */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Judicial Caseload Overview
        </h2>
        <DashboardMetrics />
      </div>

      {/* Analytics Preview Notice */}
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
        <span className="text-2xl">📊</span>
        <h3 className="text-base font-bold text-slate-800 mt-2">
          Track Distribution & Cause List Analytics
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Extended Recharts visualizations (case age distribution across FAST, STANDARD, COMPLEX tracks and disposal velocity) activate on Day 7.
        </p>
      </div>
    </div>
  );
}
