import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import DashboardMetrics from "../components/DashboardMetrics.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/dashboard");
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Failed to load judicial analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const TRACK_COLORS = {
    FAST: "#3B82F6",
    STANDARD: "#10B981",
    COMPLEX: "#8B5CF6",
  };

  const CustomAgeTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200/80 text-xs space-y-1">
          <p className="font-semibold text-slate-900">{label} Track</p>
          <p className="text-blue-700 font-medium">
            Average Age: <span className="font-mono tabular-nums font-bold">{data.averageAge}d</span>
          </p>
          <p className="text-slate-500">
            Target Disposal: <span className="font-mono tabular-nums">{data.targetDays}d</span>
          </p>
          <p className="text-slate-500">
            Active Cases: <span className="font-mono tabular-nums">{data.caseCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomWorkloadTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200/80 text-xs space-y-1">
          <p className="font-semibold text-slate-900">{label}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ color: item.color }} className="font-medium">
              {item.name}: <span className="font-mono tabular-nums font-bold">{item.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case "CASE_REGISTERED":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      case "TRACK_APPROVED":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "TRACK_OVERRIDDEN":
        return "bg-purple-50 text-purple-700 ring-purple-600/20";
      case "CAUSE_LIST_GENERATED":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      case "OUTCOME_RECORDED":
        return "bg-slate-50 text-slate-700 ring-slate-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-slate-600/20";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active Session: <span className="font-semibold text-slate-700">{user?.role}</span>
              {user?.judge && (
                <span className="tabular-nums">
                  {" "}• Assigned to {user.judge.courtroom} (Capacity: {user.judge.dailyCapacity})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Online
            </span>
          </div>
        </div>
      </div>

      {/* Caseload Performance Metrics Cards */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Judicial Caseload Overview
        </h2>
        <DashboardMetrics />
      </div>

      {/* Recharts Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart: Average Case Age by Track */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                Average Case Age by Track
              </h3>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                Statutory Tracking
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Mean days elapsed since filing across FAST (90d), STANDARD (365d), and COMPLEX (730d) tracks.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 animate-pulse">
                <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                <span>Loading statutory track distribution...</span>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-xs text-rose-500">
                Failed to load visualization data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.trackDistribution || []}
                  margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    unit=" d"
                    className="tabular-nums"
                  />
                  <Tooltip content={<CustomAgeTooltip />} />
                  <Bar
                    dataKey="averageAge"
                    name="Average Case Age (days)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  >
                    {(analytics?.trackDistribution || []).map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={TRACK_COLORS[entry.name] || "#3B82F6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="tabular-nums">FAST (90d max)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="tabular-nums">STANDARD (365d max)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span className="tabular-nums">COMPLEX (730d max)</span>
            </div>
          </div>
        </div>

        {/* Secondary Chart: Judicial Courtroom Workload & Complexity */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                Courtroom Active Workload
              </h3>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">
                Greedy Balancing
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Total active matters and cumulative complexity points assigned to each judicial bench.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 animate-pulse">
                <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                <span>Loading courtroom workload metrics...</span>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-xs text-rose-500">
                Failed to load visualization data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.judgeWorkloads || []}
                  margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="courtroom"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    className="tabular-nums"
                  />
                  <Tooltip content={<CustomWorkloadTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="activeCases"
                    name="Active Cases"
                    fill="#3B82F6"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="totalComplexity"
                    name="Cumulative Complexity"
                    fill="#F59E0B"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
            Greedy load balancing prevents complex litigation from bottlenecking a single courtroom.
          </div>
        </div>
      </div>

      {/* Recent Judicial Activity Log Feed */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">Recent Registry Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of intake, classification approvals, listings, and hearing decrees.
            </p>
          </div>
          {user?.role === "JUDGE" && (
            <Link
              to="/audit-log"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View Full Audit Log →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        ) : !analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs">No recent judicial activity recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {analytics.recentActivity.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-colors duration-150 hover:bg-slate-50/70 rounded px-1"
              >
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={log.action} />
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {log.case?.caseNumber || "Registry Event"}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    by {log.user?.name || "System"} ({log.user?.role})
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                  {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
