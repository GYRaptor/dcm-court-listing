import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import DashboardMetrics from "../components/DashboardMetrics.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
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
          dailyCapacity: item.dailyCapacity || 10,
          judgeNames: [],
        });
      }
      const existing = map.get(courtroom);
      existing.activeCases += item.activeCases || 0;
      existing.totalComplexity += item.totalComplexity || 0;
      if (item.judgeName && !existing.judgeNames.includes(item.judgeName)) {
        existing.judgeNames.push(item.judgeName);
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
      const target = data.targetDays || 90;
      const utilization = Math.round((data.averageAge / target) * 100);
      return (
        <div className="bg-surface p-3 rounded-[4px] border border-rule text-xs space-y-1 shadow-sm">
          <p className="font-semibold text-ink">{label} Track</p>
          <p className="text-muted">
            Average age: <span className="font-mono tabular-nums font-semibold text-ink">{data.averageAge}d</span>
          </p>
          <p className="text-muted">
            Configured target: <span className="font-mono tabular-nums text-ink">{target}d</span>
          </p>
          <p className="text-muted">
            Target utilization: <span className={`font-mono tabular-nums font-semibold ${utilization >= 100 ? "text-oxblood" : "text-ink"}`}>{utilization}%</span>
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
          <p className="text-muted">
            Daily listing capacity: <span className="font-mono tabular-nums text-ink">{data.dailyCapacity}</span>
          </p>
          {data.judgeNames?.length > 0 && (
            <p className="text-[11px] text-muted pt-1 border-t border-rule mt-1">
              Presiding: {data.judgeNames.join(", ")}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatUserContext = () => {
    if (!user) return "";
    if (user.role === "JUDGE") {
      return (
        <span>
          <strong className="text-ink font-medium">{user.name}</strong> &bull; Presiding, {user.judge?.courtroom || "Assigned Courtroom"}
          {user.judge?.dailyCapacity && (
            <span className="font-mono text-muted"> &bull; Daily capacity: {user.judge.dailyCapacity} matters</span>
          )}
        </span>
      );
    }
    if (user.role === "CLERK") {
      return (
        <span>
          <strong className="text-ink font-medium">{user.name}</strong> &bull; Central Filing &amp; Case Flow Administration
        </span>
      );
    }
    return <span>{user.name} &bull; Advocate Registry Docket</span>;
  };

  // Top 5 attention cases
  const topAttentionCases = useMemo(() => {
    if (!analytics?.attentionCases) return [];
    return analytics.attentionCases.slice(0, 5);
  }, [analytics]);

  const renderSingleReason = (caseItem) => {
    const isOverdue = caseItem.reasons?.some((r) => r.type === "OVERDUE");
    const isDueSoon = caseItem.reasons?.some((r) => r.type === "DUE_SOON");
    const hasAdjournments = caseItem.adjournmentCount >= 2;
    const isUnapproved = !caseItem.trackApproved;

    if (isOverdue) {
      const r = caseItem.reasons.find((item) => item.type === "OVERDUE");
      return (
        <div className="flex items-center text-xs text-oxblood font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-oxblood shrink-0 mr-1.5"></span>
          <span>{r?.label || "Overdue past target"}</span>
          {hasAdjournments && (
            <span className="text-muted ml-1.5 font-normal">&bull; {caseItem.adjournmentCount} adjournments</span>
          )}
        </div>
      );
    }

    if (isDueSoon) {
      const r = caseItem.reasons.find((item) => item.type === "DUE_SOON");
      return (
        <div className="flex items-center text-xs text-ochre font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0 mr-1.5"></span>
          <span>{r?.label || "Due soon"}</span>
          {hasAdjournments && (
            <span className="text-muted ml-1.5 font-normal">&bull; {caseItem.adjournmentCount} adjournments</span>
          )}
        </div>
      );
    }

    if (isUnapproved) {
      return (
        <div className="flex items-center text-xs text-ochre">
          <span className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0 mr-1.5"></span>
          <span>Awaiting judicial review</span>
        </div>
      );
    }

    if (hasAdjournments) {
      return (
        <div className="flex items-center text-xs text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0 mr-1.5"></span>
          <span>{caseItem.adjournmentCount} adjournments</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-xs text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-rule shrink-0 mr-1.5"></span>
        <span>High listing priority</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-12">
      {/* 1. Header + Lightweight Inline Quick Actions */}
      <section aria-label="Dashboard header" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Court registry dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              {formatUserContext()}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-muted self-start sm:self-auto shrink-0">
            As of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (IST)
          </div>
        </div>
        <div className="rule-double"></div>

        {/* Lightweight Inline Quick Actions Bar */}
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          {user?.role === "CLERK" && (
            <>
              <Link
                to="/cases/new"
                className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[4px] transition shadow-xs"
              >
                + Register new matter
              </Link>
              <Link
                to="/cause-list"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-medium rounded-[4px] transition"
              >
                Generate cause list
              </Link>
              <Link
                to="/lookup"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-mono rounded-[4px] transition"
              >
                Docket lookup
              </Link>
              <Link
                to="/cases"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-medium rounded-[4px] transition"
              >
                Master registry
              </Link>
            </>
          )}

          {user?.role === "JUDGE" && (
            <>
              <Link
                to="/hearings"
                className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[4px] transition shadow-xs"
              >
                Today's bench hearings
              </Link>
              <Link
                to="/cause-list"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-medium rounded-[4px] transition"
              >
                Cause list generator
              </Link>
              <Link
                to="/audit-log"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-medium rounded-[4px] transition"
              >
                Review audit logs
              </Link>
              <Link
                to="/lookup"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-mono rounded-[4px] transition"
              >
                Docket lookup
              </Link>
              <Link
                to="/cases"
                className="px-3 py-1.5 border border-rule hover:bg-paper/70 text-ink text-xs font-medium rounded-[4px] transition"
              >
                Master registry
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 2. 5-Column Operational KPI Strip */}
      <section aria-label="Caseload figures">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-caps text-[11px] text-muted">
            Caseload overview &amp; operational metrics
          </h2>
          <span className="text-[11px] font-mono tabular-nums text-muted">
            Aggregated across all courtrooms
          </span>
        </div>
        <DashboardMetrics initialStats={analytics?.summary} />
      </section>

      {/* 3. Analytics Charts Section (Above the Tables) */}
      <section id="analytics" aria-label="Judicial analytics" className="space-y-6">
        <div className="border-b border-rule pb-2 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-serif font-semibold text-ink">
              Judicial analytics &amp; capacity allocation
            </h2>
            <p className="text-xs text-muted">
              Visual track compliance trends and courtroom workload distribution.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted tabular-nums hidden sm:inline">
            Active dockets: {analytics?.summary?.totalPending || 0} pending &bull; {analytics?.summary?.totalListed || 0} listed
          </span>
        </div>

        {/* Spacious 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Chart: Case Age by Track */}
          <div className="bg-surface border border-rule rounded-[4px] p-5 flex flex-col justify-between">
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
              <span>FAST: 90d target</span>
              <span>STANDARD: 365d target</span>
              <span>COMPLEX: 730d target</span>
            </div>
          </div>

          {/* Secondary Chart: Workload by Courtroom */}
          <div className="bg-surface border border-rule rounded-[4px] p-5 flex flex-col justify-between">
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

            <div className="pt-3 mt-3 border-t border-rule text-[11px] text-muted flex items-center justify-between font-mono">
              <span>Greedy balancing active</span>
              <span>Benchmark capacity: 10/day</span>
            </div>
          </div>
        </div>

        {/* Status Lifecycle Breakdown */}
        {analytics?.statusBreakdown && (
          <div className="bg-surface border border-rule rounded-[4px] p-4">
            <span className="font-caps text-[11px] text-muted block mb-2">
              Caseload lifecycle distribution
            </span>
            <div className="grid grid-cols-3 divide-x divide-rule border border-rule bg-paper rounded-[3px] text-center p-2.5">
              {analytics.statusBreakdown.map((s, idx) => (
                <div key={idx} className="px-2">
                  <span className="font-caps text-[10px] text-muted block">{s.name}</span>
                  <span className="font-serif text-lg font-bold text-ink tabular-nums">{s.count}</span>
                  <span className="text-[10px] text-muted block font-mono">
                    {analytics.summary?.totalCases > 0
                      ? `${Math.round((s.count / analytics.summary.totalCases) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Operational Tables & Activity Feed (Below Charts) */}

      {/* Attention Required Matters (Top 5) */}
      <section id="attention" aria-label="Attention required cases" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-rule pb-2">
          <div>
            <h2 className="text-lg font-serif font-semibold text-ink">
              Attention required matters
            </h2>
            <p className="text-xs text-muted">
              Top prioritized cases exceeding track targets, approaching target deadlines, or with repeated adjournments.
            </p>
          </div>
          <Link
            to="/cases?status=PENDING"
            className="text-xs font-mono text-accent hover:underline self-start sm:self-auto"
          >
            View all flagged cases &rarr;
          </Link>
        </div>

        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-muted animate-pulse">
              Inspecting active matters for compliance flags...
            </div>
          ) : topAttentionCases.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No critical attention matters"
                description="All active cases are currently compliant within their statutory track targets and hearing gap rules."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-rule text-left text-xs">
                <thead className="bg-paper text-muted font-caps text-[11px] border-b border-rule">
                  <tr>
                    <th className="py-3.5 px-4 text-right w-16">Priority</th>
                    <th className="py-3.5 px-4">Case Number</th>
                    <th className="py-3.5 px-4">Title &amp; Type</th>
                    <th className="py-3.5 px-4">Track</th>
                    <th className="py-3.5 px-4 text-right">Age</th>
                    <th className="py-3.5 px-4">Compliance Status &amp; Reason</th>
                    <th className="py-3.5 px-4">Assigned Bench</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {topAttentionCases.map((c) => (
                    <tr key={c.id} className="hover:bg-paper/40 transition-colors duration-100">
                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono tabular-nums">
                        <span className={c.priorityScore >= 70 ? "text-oxblood font-semibold" : c.priorityScore >= 40 ? "text-ochre" : "text-ink"}>
                          {Number(c.priorityScore || 0).toFixed(1)}
                        </span>
                      </td>

                      {/* Case Number */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${c.id}`} className="text-accent hover:underline font-semibold">
                          {c.caseNumber}
                        </Link>
                      </td>

                      {/* Title & Type */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-ink truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-muted font-mono mt-0.5">
                          {c.caseType}
                        </div>
                      </td>

                      {/* Track */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge track={c.track} />
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {c.ageDays}d
                      </td>

                      {/* Crisp Single-Line Operational Reason */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderSingleReason(c)}
                      </td>

                      {/* Assigned Bench */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-ink">{c.courtroom}</div>
                        <div className="text-[10px] text-muted">{c.judgeName}</div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="font-mono text-xs text-accent hover:underline"
                        >
                          Dossier &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Today's Hearings Docket */}
      <section id="todays-hearings" aria-label="Today's courtroom hearings" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-rule pb-2">
          <div>
            <h2 className="text-lg font-serif font-semibold text-ink">
              Today's courtroom docket
            </h2>
            <p className="text-xs text-muted">
              Scheduled and listed hearing proceedings across all judicial benches for today's session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted tabular-nums">
              {analytics?.summary?.hearingsToday || 0} hearings today
            </span>
            <Link
              to="/cause-list"
              className="text-xs font-mono text-accent hover:underline"
            >
              Full cause list &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-muted animate-pulse">
              Loading today's hearing entries...
            </div>
          ) : !analytics?.todayHearings || analytics.todayHearings.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No hearings listed for today"
                description="No court sessions are currently recorded for today's date. Generate a daily cause list to schedule proceedings."
                actionLabel={user?.role === "CLERK" ? "Generate Cause List" : undefined}
                onAction={user?.role === "CLERK" ? () => window.location.assign("/cause-list") : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-rule text-left text-xs">
                <thead className="bg-paper text-muted font-caps text-[11px] border-b border-rule">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4">Case Number</th>
                    <th className="py-3.5 px-4">Cause Title</th>
                    <th className="py-3.5 px-4">Courtroom &amp; Presiding</th>
                    <th className="py-3.5 px-4 text-right">Priority</th>
                    <th className="py-3.5 px-4 text-center">Status / Outcome</th>
                    <th className="py-3.5 px-4">Judicial Remarks</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {analytics.todayHearings.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-paper/40 transition-colors duration-100">
                      <td className="py-3.5 px-4 text-center font-mono text-muted tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${h.case.id}`} className="text-accent hover:underline font-semibold">
                          {h.case.caseNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-ink truncate" title={h.case.title}>
                          {h.case.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">{h.case.caseType}</span>
                          <StatusBadge track={h.case.track} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-ink">{h.courtroom}</div>
                        <div className="text-[10px] text-muted">{h.judgeName}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {Number(h.case.priorityScore || 0).toFixed(1)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge outcome={h.outcome} />
                      </td>

                      <td className="py-3.5 px-4 text-muted italic max-w-xs truncate" title={h.remarks || "No remarks"}>
                        {h.remarks ? `"${h.remarks}"` : <span className="not-italic text-muted/50">&mdash;</span>}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${h.case.id}`}
                          className="font-mono text-xs text-accent hover:underline"
                        >
                          Dossier &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Recent Registry Activity Feed */}
      <section
        id="recent-activity"
        aria-label="Recent registry activity"
        className="bg-surface border border-rule rounded-[4px] p-5 space-y-4"
      >
        <div className="flex items-baseline justify-between border-b border-rule pb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink font-serif">
              Recent registry activity
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Chronological log of intake, track classifications, cause lists, and hearing decrees.
            </p>
          </div>
          {user?.role === "JUDGE" && (
            <Link
              to="/audit-log"
              className="text-xs font-mono text-accent hover:underline"
            >
              View full audit log &rarr;
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
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-colors duration-100 hover:bg-paper/40"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge status={log.action} />
                  {log.case ? (
                    <Link
                      to={`/cases/${log.case.id || ""}`}
                      className="font-semibold text-accent hover:underline font-mono tabular-nums"
                    >
                      {log.case.caseNumber}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink font-mono tabular-nums">
                      Registry Event
                    </span>
                  )}
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