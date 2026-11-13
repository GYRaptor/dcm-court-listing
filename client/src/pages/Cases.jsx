import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";

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

  const getTrackBadge = (trackName) => {
    switch (trackName) {
      case "FAST":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "STANDARD":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
      case "COMPLEX":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "LISTED":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      case "DISPOSED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
    }
  };

  const getPriorityScoreBadge = (score) => {
    if (score >= 70) {
      return "bg-rose-50 text-rose-700 ring-rose-600/20 font-bold";
    }
    if (score >= 40) {
      return "bg-amber-50 text-amber-700 ring-amber-600/20 font-semibold";
    }
    return "bg-slate-50 text-slate-700 ring-slate-600/20";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Master Case Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete institutional docket sorted by statutory priority score.
          </p>
        </div>
        {user?.role === "CLERK" && (
          <Link
            to="/cases/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition"
          >
            <span>+</span> Register New Matter
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-wrap gap-3.5 items-center">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Track
          </label>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          >
            <option value="">All Tracks</option>
            <option value="FAST">FAST (90d)</option>
            <option value="STANDARD">STANDARD (365d)</option>
            <option value="COMPLEX">COMPLEX (730d)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="LISTED">LISTED</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Judicial Approval
          </label>
          <select
            value={approvedFilter}
            onChange={(e) => setApprovedFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          >
            <option value="">All (Approved & Review)</option>
            <option value="false">⚠️ Awaiting Review Only</option>
            <option value="true">✓ Approved Only</option>
          </select>
        </div>

        {user?.role === "CLERK" && judges.length > 0 && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Assigned Bench
            </label>
            <select
              value={judgeFilter}
              onChange={(e) => setJudgeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
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
            className="text-xs text-blue-600 hover:text-blue-700 font-medium self-end pb-1.5 transition"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-3">
          <div className="h-4 bg-slate-200/70 rounded w-1/4"></div>
          <div className="h-10 bg-slate-100 rounded-lg"></div>
          <div className="h-10 bg-slate-100 rounded-lg"></div>
          <div className="h-10 bg-slate-100 rounded-lg"></div>
        </div>
      )}

      {/* Cases Table */}
      {!loading && !error && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          {cases.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <span className="text-3xl">📂</span>
              <p className="text-sm font-semibold text-slate-700">No cases found</p>
              <p className="text-xs text-slate-400">
                No court matters match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Case Number</th>
                    <th className="px-4 py-3">Cause Title & Type</th>
                    <th className="px-4 py-3">Track</th>
                    <th className="px-4 py-3">Review</th>
                    <th className="px-4 py-3">Assigned Bench</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      {/* Priority Score Pill */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono tabular-nums ring-1 ring-inset ${getPriorityScoreBadge(
                            Number(c.priorityScore)
                          )}`}
                        >
                          ⚡ {Number(c.priorityScore).toFixed(1)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap tabular-nums">
                        <Link to={`/cases/${c.id}`} className="hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{c.caseType}</span>
                          {c.isOverdue && (
                            <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              Overdue
                            </span>
                          )}
                          {c.isAging && (
                            <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Aging (&gt;5y)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ${getTrackBadge(
                            c.track?.name
                          )}`}
                        >
                          {c.track?.name} ({c.track?.targetDays}d)
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.trackApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 px-2 py-0.5 rounded-md">
                            <span>✓</span> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 ring-1 ring-inset ring-amber-600/20 px-2 py-0.5 rounded-md">
                            <span>⚠️</span> Review
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                        {c.judge ? (
                          <div>
                            <span className="font-semibold text-slate-800">{c.judge.courtroom}</span>
                            <div className="text-[10px] text-slate-400">{c.judge.user?.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium uppercase ${getStatusBadge(
                            c.status
                          )}`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-md text-xs font-medium transition shadow-sm"
                        >
                          Dossier →
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
