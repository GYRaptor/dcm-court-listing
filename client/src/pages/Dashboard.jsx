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

  const getReasonBadgeClass = (type) => {
    switch (type) {
      case "OVERDUE":
        return "text-oxblood bg-oxblood-light/60 border border-oxblood/30";
      case "DUE_SOON":
        return "text-ochre bg-ochre-light/70 border border-ochre/30";
      case "ADJOURNED":
        return "text-ink bg-paper border border-rule";
      case "UNAPPROVED":
        return "text-ochre bg-ochre-light/50 border border-ochre/30";
      case "HIGH_PRIORITY":
        return "text-accent bg-paper border border-accent/30 font-semibold";
      default:
        return "text-muted bg-paper border border-rule";
    }
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
              {formatUserContext()}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-muted self-start sm:self-auto shrink-0">
            As of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (IST)
          </div>
        </div>
        <div className="rule-double"></div>
      </div>

      {/* Quick Actions Bar */}
      <section aria-label="Operational quick actions" className="bg-surface border border-rule rounded-[4px] p-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-caps text-[11px] text-muted mr-1">Quick actions:</span>

            {user?.role === "CLERK" && (
              <>
                <Link
                  to="/cases/new"
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition"
                >
                  + Register new matter
                </Link>
                <Link
                  to="/cause-list"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition"
                >
                  Generate cause list
                </Link>
                <Link
                  to="/lookup"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition font-mono"
                >
                  Docket lookup
                </Link>
                <Link
                  to="/cases"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition"
                >
                  Master registry
                </Link>
              </>
            )}

            {user?.role === "JUDGE" && (
              <>
                <Link
                  to="/hearings"
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition"
                >
                  Today's bench hearings
                </Link>
                <Link
                  to="/cause-list"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition"
                >
                  Cause list generator
                </Link>
                <Link
                  to="/audit-log"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition"
                >
                  Review audit logs
                </Link>
                <Link
                  to="/lookup"
                  className="px-3 py-1.5 border border-rule bg-paper hover:bg-paper/80 text-ink text-xs font-medium rounded-[3px] transition font-mono"
                >
                  Docket lookup
                </Link>
              </>
            )}
          </div>

          {/* Section Jump Links */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted pt-2 md:pt-0 border-t md:border-t-0 border-rule">
            <span className="text-muted/60 hidden sm:inline">Jump to:</span>
            <a href="#attention" className="hover:text-accent hover:underline">
              Attention ({analytics?.attentionCases?.length || 0})
            </a>
            <span>&bull;</span>
            <a href="#todays-hearings" className="hover:text-accent hover:underline">
              Hearings ({analytics?.summary?.hearingsToday || 0})
            </a>
            <span>&bull;</span>
            <a href="#analytics" className="hover:text-accent hover:underline">
              Analytics
            </a>
          </div>
        </div>
      </section>

      {/* Caseload Figures Strip */}
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

      {/* SECTION E: Attention Required */}
      <section id="attention" aria-label="Attention required cases" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-rule pb-2">
          <div>
            <h2 className="text-lg font-serif font-semibold text-ink">
              Attention required matters
            </h2>
            <p className="text-xs text-muted">
              Active matters exceeding track targets, approaching target deadlines, with repeated adjournments, or awaiting judicial review.
            </p>
          </div>
          <span className="text-xs font-mono text-muted tabular-nums">
            {analytics?.attentionCases?.length || 0} matters flagged
          </span>
        </div>

        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-muted animate-pulse">
              Inspecting active matters for compliance flags...
            </div>
          ) : !analytics?.attentionCases || analytics.attentionCases.length === 0 ? (
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
                    <th className="px-3.5 py-2.5 text-right w-16">Priority</th>
                    <th className="px-3.5 py-2.5">Case Number</th>
                    <th className="px-3.5 py-2.5">Title &amp; Type</th>
                    <th className="px-3.5 py-2.5">Track</th>
                    <th className="px-3.5 py-2.5 text-right">Age</th>
                    <th className="px-3.5 py-2.5">Flags / Operational Reason</th>
                    <th className="px-3.5 py-2.5">Assigned Bench</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {analytics.attentionCases.map((c) => (
                    <tr key={c.id} className="hover:bg-paper/40 transition-colors duration-100">
                      {/* Priority */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right font-mono tabular-nums">
                        <span className={c.priorityScore >= 70 ? "text-oxblood font-semibold" : c.priorityScore >= 40 ? "text-ochre" : "text-ink"}>
                          {Number(c.priorityScore || 0).toFixed(1)}
                        </span>
                      </td>

                      {/* Case Number */}
                      <td className="px-3.5 py-2.5 font-mono whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${c.id}`} className="text-accent hover:underline font-semibold">
                          {c.caseNumber}
                        </Link>
                      </td>

                      {/* Title & Type */}
                      <td className="px-3.5 py-2.5 max-w-xs">
                        <div className="font-medium text-ink truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-muted font-mono mt-0.5">
                          {c.caseType}
                        </div>
                      </td>

                      {/* Track */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <StatusBadge track={c.track} />
                      </td>

                      {/* Age */}
                      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {c.ageDays}d
                      </td>

                      {/* Flags / Operational Reasons */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {c.reasons?.map((r, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono tabular-nums ${getReasonBadgeClass(
                                r.type
                              )}`}
                            >
                              {r.label}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Assigned Bench */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-ink">{c.courtroom}</div>
                        <div className="text-[10px] text-muted">{c.judgeName}</div>
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
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

      {/* SECTION F: Today's Hearings Docket */}
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
                    <th className="px-3.5 py-2.5 text-center w-12">#</th>
                    <th className="px-3.5 py-2.5">Case Number</th>
                    <th className="px-3.5 py-2.5">Cause Title</th>
                    <th className="px-3.5 py-2.5">Courtroom &amp; Presiding</th>
                    <th className="px-3.5 py-2.5 text-right">Priority</th>
                    <th className="px-3.5 py-2.5 text-center">Status / Outcome</th>
                    <th className="px-3.5 py-2.5">Judicial Remarks</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {analytics.todayHearings.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-paper/40 transition-colors duration-100">
                      <td className="px-3.5 py-2.5 text-center font-mono text-muted tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${h.case.id}`} className="text-accent hover:underline font-semibold">
                          {h.case.caseNumber}
                        </Link>
                      </td>

                      <td className="px-3.5 py-2.5 max-w-xs">
                        <div className="font-medium text-ink truncate" title={h.case.title}>
                          {h.case.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">{h.case.caseType}</span>
                          <StatusBadge track={h.case.track} />
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-ink">{h.courtroom}</div>
                        <div className="text-[10px] text-muted">{h.judgeName}</div>
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {Number(h.case.priorityScore || 0).toFixed(1)}
                      </td>

                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <StatusBadge outcome={h.outcome} />
                      </td>

                      <td className="px-3.5 py-2.5 text-muted italic max-w-xs truncate" title={h.remarks || "No remarks"}>
                        {h.remarks ? `"${h.remarks}"` : <span className="not-italic text-muted/50">&mdash;</span>}
                      </td>

                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
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

      {/* SECTION G: Analytics Section */}
      <section id="analytics" aria-label="Judicial analytics" className="space-y-6">
        <div className="border-b border-rule pb-2">
          <h2 className="text-lg font-serif font-semibold text-ink">
            Judicial analytics &amp; capacity allocation
          </h2>
          <p className="text-xs text-muted">
            Track age compliance, target disposal utilization, and courtroom complexity distribution.
          </p>
        </div>

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
              <span>FAST: 90d target</span>
              <span>STANDARD: 365d target</span>
              <span>COMPLEX: 730d target</span>
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

            <div className="pt-3 mt-3 border-t border-rule text-[11px] text-muted flex items-center justify-between font-mono">
              <span>Greedy load balancing active</span>
              <span>Court capacity benchmark: 10/day</span>
            </div>
          </section>
        </div>

        {/* Status Breakdown Bar */}
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

      {/* SECTION H: Recent Registry Activity Feed */}
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