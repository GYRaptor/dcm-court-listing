import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import DashboardMetrics from "../components/DashboardMetrics.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

  // Aggregated workload by courtroom to eliminate duplicates from database seed
  const aggregatedWorkloads = useMemo(() => {
    if (!analytics?.judgeWorkloads) return [];
    const map = new Map();
    for (const item of analytics.judgeWorkloads) {
      const courtroom = item.courtroom || "Unassigned";
      if (!map.has(courtroom)) {
        map.set(courtroom, {
          courtroom,
          activeCases: 0,
          totalComplexity: 0,
          judgeNames: [],
        });
      }
      const existing = map.get(courtroom);
      existing.activeCases += item.activeCases || 0;
      existing.totalComplexity += item.totalComplexity || 0;
      if (item.name && !existing.judgeNames.includes(item.name)) {
        existing.judgeNames.push(item.name);
      }
    }
    return Array.from(map.values());
  }, [analytics]);

  const TRACK_NAVY_TINTS = {
    FAST: "#6B88AB",
    STANDARD: "#3E6088",
    COMPLEX: "#1F3A5F",
  };

  const CustomAgeTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface p-3 rounded-[4px] border border-rule text-xs space-y-1 shadow-sm">
          <p className="font-semibold text-ink">{label} Track</p>
          <p className="text-muted">
            Average age: <span className="font-mono tabular-nums font-semibold text-ink">{data.averageAge}d</span>
          </p>
          <p className="text-muted">
            Configurable target: <span className="font-mono tabular-nums text-ink">{data.targetDays}d</span>
          </p>
          <p className="text-muted">
            Active caseload: <span className="font-mono tabular-nums text-ink">{data.caseCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomWorkloadTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface p-3 rounded-[4px] border border-rule text-xs space-y-1 shadow-sm">
          <p className="font-semibold text-ink">{data.courtroom}</p>
          <p className="text-muted">
            Cumulative complexity: <span className="font-mono tabular-nums font-semibold text-ink">{data.totalComplexity} pts</span>
          </p>
          <p className="text-muted">
            Active matters: <span className="font-mono tabular-nums text-ink">{data.activeCases}</span>
          </p>
          {data.judgeNames?.length > 0 && (
            <p className="text-[11px] text-muted">
              Bench: {data.judgeNames.join(", ")}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Court registry dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Caseload distribution, track compliance, and courtroom allocation metrics.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-muted self-start sm:self-auto">
            As of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (IST)
          </div>
        </div>
        <div className="rule-double"></div>
      </div>

      {/* Caseload Figures Strip */}
      <section aria-label="Caseload figures">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-caps text-[11px] text-muted">
            Caseload overview
          </h2>
          <span className="text-[11px] font-mono tabular-nums text-muted">
            Aggregated across all tracks
          </span>
        </div>
        <DashboardMetrics />
      </section>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Chart: Case Age by Track */}
        <section
          aria-label="Average case age by track"
          className="bg-surface border border-rule rounded-[4px] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-semibold text-ink font-serif">
                Average case age by track
              </h3>
              <span className="font-mono text-[11px] text-muted">
                Mean days elapsed
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Track targets (configurable): FAST 90d, STANDARD 365d, COMPLEX 730d.
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted font-mono animate-pulse">
                Loading track distribution...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-xs text-oxblood">
                {error}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.trackDistribution || []}
                  margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#DAD5C8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#5C6470", fontFamily: "IBM Plex Sans" }}
                    axisLine={{ stroke: "#DAD5C8" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5C6470", fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: "#DAD5C8" }}
                    tickLine={false}
                    unit="d"
                    className="tabular-nums"
                  />
                  <Tooltip content={<CustomAgeTooltip />} cursor={{ fill: "rgba(31,58,95,0.04)" }} />
                  <Bar
                    dataKey="averageAge"
                    name="Average age (days)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={44}
                  >
                    {(analytics?.trackDistribution || []).map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={TRACK_NAVY_TINTS[entry.name] || "#1F3A5F"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-rule flex items-center justify-between text-[11px] text-muted font-mono tabular-nums">
            <span>FAST: 90d max</span>
            <span>STANDARD: 365d max</span>
            <span>COMPLEX: 730d max</span>
          </div>
        </section>

        {/* Secondary Chart: Workload by Courtroom */}
        <section
          aria-label="Workload by courtroom"
          className="bg-surface border border-rule rounded-[4px] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-semibold text-ink font-serif">
                Workload by courtroom
              </h3>
              <span className="font-mono text-[11px] text-muted">
                Cumulative complexity
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Total cumulative complexity points across active cases (pending and listed).
            </p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted font-mono animate-pulse">
                Loading courtroom workload metrics...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-xs text-oxblood">
                {error}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aggregatedWorkloads}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#DAD5C8" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#5C6470", fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: "#DAD5C8" }}
                    tickLine={false}
                    className="tabular-nums"
                  />
                  <YAxis
                    type="category"
                    dataKey="courtroom"
                    tick={{ fontSize: 11, fill: "#1C2230", fontFamily: "IBM Plex Sans" }}
                    axisLine={{ stroke: "#DAD5C8" }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomWorkloadTooltip />} cursor={{ fill: "rgba(31,58,95,0.04)" }} />
                  <Bar
                    dataKey="totalComplexity"
                    name="Cumulative complexity points"
                    fill="#1F3A5F"
                    radius={[0, 2, 2, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-rule text-[11px] text-muted">
            Greedy load balancing distributes filed matters by complexity to prevent courtroom backlogs.
          </div>
        </section>
      </div>

      {/* Recent Registry Activity */}
      <section
        aria-label="Recent registry activity"
        className="bg-surface border border-rule rounded-[4px] p-5 space-y-4"
      >
        <div className="flex items-baseline justify-between border-b border-rule pb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink font-serif">
              Recent registry activity
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Intake, track assignments, cause list generation, and hearing proceedings.
            </p>
          </div>
          {user?.role === "JUDGE" && (
            <Link
              to="/audit-log"
              className="text-xs font-mono text-accent hover:underline"
            >
              Full audit log &rarr;
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 bg-rule/30 rounded-[2px]"></div>
            ))}
          </div>
        ) : !analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted font-mono">
            No recent registry activity recorded.
          </div>
        ) : (
          <div className="divide-y divide-rule text-xs">
            {analytics.recentActivity.map((log) => (
              <div
                key={log.id}
                className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-colors duration-100 hover:bg-paper/40"
              >
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={log.action} />
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {log.case?.caseNumber || "Registry Event"}
                  </span>
                  <span className="text-muted text-[11px]">
                    by {log.user?.name || "System"} ({log.user?.role})
                  </span>
                </div>
                <span className="text-muted text-[11px] font-mono tabular-nums">
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
      </section>
    </div>
  );
}