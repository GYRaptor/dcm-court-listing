import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonTable } from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [trackFilter, setTrackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvedFilter, setApprovedFilter] = useState("");
  const [judgeFilter, setJudgeFilter] = useState("");

  const fetchCases = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (trackFilter) params.append("track", trackFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (approvedFilter) params.append("approved", approvedFilter);
      if (judgeFilter) params.append("judgeId", judgeFilter);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get(`/cases${qs}`);
      setCases(res.cases || []);
    } catch (err) {
      setError(err.message || "Failed to load court cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [trackFilter, statusFilter, approvedFilter, judgeFilter]);

  // Load judges for clerk filter
  useEffect(() => {
    if (user?.role === "CLERK") {
      api
        .get("/judges")
        .then((res) => setJudges(res.judges || []))
        .catch(() => {});
    }
  }, [user?.role]);

  const getPriorityScoreClass = (score) => {
    if (score >= 70) return "text-oxblood font-semibold";
    if (score >= 40) return "text-ochre font-semibold";
    return "text-ink";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Cases
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              District court registry sorted by priority score.
            </p>
          </div>
          {user?.role === "CLERK" && (
            <Link
              to="/cases/new"
              className="inline-flex items-center px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition self-start sm:self-auto"
            >
              Register case
            </Link>
          )}
        </div>
        <div className="rule-double"></div>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Registry filters"
        className="bg-surface border border-rule rounded-[4px] p-4 flex flex-wrap gap-4 items-center"
      >
        <div>
          <label className="block font-caps text-[11px] text-muted mb-1">
            Track
          </label>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans border border-rule rounded-[3px] bg-paper text-ink focus:outline-none focus:border-accent"
          >
            <option value="">All Tracks</option>
            <option value="FAST">FAST (90d)</option>
            <option value="STANDARD">STANDARD (365d)</option>
            <option value="COMPLEX">COMPLEX (730d)</option>
          </select>
        </div>

        <div>
          <label className="block font-caps text-[11px] text-muted mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans border border-rule rounded-[3px] bg-paper text-ink focus:outline-none focus:border-accent"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="LISTED">LISTED</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>
        </div>

        <div>
          <label className="block font-caps text-[11px] text-muted mb-1">
            Judicial Approval
          </label>
          <select
            value={approvedFilter}
            onChange={(e) => setApprovedFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans border border-rule rounded-[3px] bg-paper text-ink focus:outline-none focus:border-accent"
          >
            <option value="">All (Approved & Review)</option>
            <option value="false">Awaiting Review Only</option>
            <option value="true">Approved Only</option>
          </select>
        </div>

        {user?.role === "CLERK" && judges.length > 0 && (
          <div>
            <label className="block font-caps text-[11px] text-muted mb-1">
              Assigned Bench
            </label>
            <select
              value={judgeFilter}
              onChange={(e) => setJudgeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-sans border border-rule rounded-[3px] bg-paper text-ink focus:outline-none focus:border-accent"
            >
              <option value="">All Courtrooms</option>
              {judges.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.courtroom} — {j.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(trackFilter || statusFilter || approvedFilter || judgeFilter) && (
          <button
            onClick={() => {
              setTrackFilter("");
              setStatusFilter("");
              setApprovedFilter("");
              setJudgeFilter("");
            }}
            className="text-xs text-accent hover:underline font-medium self-end pb-1"
          >
            Reset filters
          </button>
        )}
      </section>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && <SkeletonTable rows={6} cols={8} />}

      {/* Cases Table */}
      {!loading && !error && (
        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
          {cases.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No cases found"
                description="No court matters match the current filter criteria."
                actionLabel={
                  trackFilter || statusFilter || approvedFilter || judgeFilter
                    ? "Reset Filters"
                    : undefined
                }
                onAction={
                  trackFilter || statusFilter || approvedFilter || judgeFilter
                    ? () => {
                        setTrackFilter("");
                        setStatusFilter("");
                        setApprovedFilter("");
                        setJudgeFilter("");
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-rule text-left text-xs">
                <thead className="bg-paper text-muted font-caps text-[11px] border-b border-rule">
                  <tr>
                    <th className="py-3.5 px-4 text-right w-20">Priority</th>
                    <th className="py-3.5 px-4">Case Number</th>
                    <th className="py-3.5 px-4">Cause Title &amp; Type</th>
                    <th className="py-3.5 px-4">Track</th>
                    <th className="py-3.5 px-4">Review</th>
                    <th className="py-3.5 px-4">Assigned Bench</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-paper/40 transition-colors duration-100">
                      {/* Priority Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono tabular-nums">
                        <span className={getPriorityScoreClass(Number(c.priorityScore))}>
                          {Number(c.priorityScore).toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${c.id}`} className="text-accent hover:underline font-semibold">
                          {c.caseNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-ink truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted font-sans">{c.caseType}</span>
                          {c.isOverdue && (
                            <span className="text-[10px] font-mono text-oxblood font-semibold">
                              [Overdue]
                            </span>
                          )}
                          {c.isAging && (
                            <span className="text-[10px] font-mono text-ochre font-semibold">
                              [Aging &gt;5y]
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge track={c.track?.name} />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.trackApproved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-ink font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-ochre font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-ochre"></span>
                            Awaiting review
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-ink">
                        {c.judge ? (
                          <div>
                            <span className="font-semibold">{c.judge.courtroom}</span>
                            <div className="text-[10px] text-muted">{c.judge.user?.name}</div>
                          </div>
                        ) : (
                          <span className="text-muted italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          View case &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}