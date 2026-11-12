import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import DashboardMetrics from "../components/DashboardMetrics.jsx";
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

  // Custom Recharts Tooltip for Average Age Chart
  const CustomAgeTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-xs space-y-1">
          <p className="font-bold text-slate-800">{label} Track</p>
          <p className="text-blue-600 font-semibold">
            Average Age: <span className="font-mono">{data.averageAge} days</span>
          </p>
          <p className="text-slate-500">
            Target Disposal: <span className="font-mono">{data.targetDays} days</span>
          </p>
          <p className="text-slate-500">
            Active Cases: <span className="font-mono">{data.caseCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

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

      {/* Caseload Performance Metrics Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Judicial Caseload Overview
        </h2>
        <DashboardMetrics />
      </div>

      {/* Recharts Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart: Average Case Age by Track */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">
                Average Case Age by Track
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Statutory Tracking
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Mean days elapsed since initial filing date across FAST (90d), STANDARD (365d), and COMPLEX (730d) tracks.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Loading track chart...
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    unit=" d"
                  />
                  <Tooltip content={<CustomAgeTooltip />} />
                  <Bar
                    dataKey="averageAge"
                    name="Average Case Age (days)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
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
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>FAST (Max 90d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>STANDARD (Max 365d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>COMPLEX (Max 730d)</span>
            </div>
          </div>
        </div>

        {/* Secondary Chart: Judicial Courtroom Workload & Complexity */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">
                Courtroom Active Workload
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Greedy Balancing
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Total active matters and cumulative complexity points handled by each judicial bench.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Loading workload chart...
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="courtroom"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === "activeCases" ? "Active Cases" : "Complexity Score",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="activeCases"
                    name="Active Cases"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="totalComplexity"
                    name="Cumulative Complexity"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
            Workload balancing ensures equitable distribution of complex multi-party trials.
          </div>
        </div>
      </div>

      {/* Recent Judicial Activity Log Feed */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Registry Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of case registrations, track approvals, listing generations, and hearing outcomes.
            </p>
          </div>
          {user?.role === "JUDGE" && (
            <a
              href="/audit-log"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View Full Audit Log →
            </a>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        ) : !analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">No recent activity recorded.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {analytics.recentActivity.map((log) => {
              const actionColors = {
                CASE_REGISTERED: "bg-blue-100 text-blue-800",
                TRACK_APPROVED: "bg-emerald-100 text-emerald-800",
                TRACK_OVERRIDDEN: "bg-purple-100 text-purple-800",
                CAUSE_LIST_GENERATED: "bg-amber-100 text-amber-800",
                OUTCOME_RECORDED: "bg-slate-100 text-slate-800",
              };

              return (
                <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        actionColors[log.action] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {log.case?.caseNumber || "Registry Event"}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      by {log.user?.name || "System"} ({log.user?.role})
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
