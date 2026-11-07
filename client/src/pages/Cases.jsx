import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";

export default function Cases() {
  const { user } = useAuth();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [trackFilter, setTrackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvedFilter, setApprovedFilter] = useState("");

  const fetchCases = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (trackFilter) queryParams.append("track", trackFilter);
      if (statusFilter) queryParams.append("status", statusFilter);
      if (approvedFilter) queryParams.append("approved", approvedFilter);

      const qs = queryParams.toString();
      const endpoint = qs ? `/cases?${qs}` : "/cases";
      const res = await api.get(endpoint);
      setCases(res.cases || []);
    } catch (err) {
      setError(err.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [trackFilter, statusFilter, approvedFilter]);

  // Track Badge styling helper
  const getTrackBadge = (trackName) => {
    switch (trackName) {
      case "FAST":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "STANDARD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "COMPLEX":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Case Registry</h1>
          <p className="text-sm text-slate-500">
            Master repository of court filings, assigned DCFM tracks, and judicial review statuses.
          </p>
        </div>
        {user?.role === "CLERK" && (
          <Link
            to="/cases/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <span>+</span> Register New Matter
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Track
          </label>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Tracks</option>
            <option value="FAST">FAST (90 Days)</option>
            <option value="STANDARD">STANDARD (365 Days)</option>
            <option value="COMPLEX">COMPLEX (730 Days)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="LISTED">LISTED</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Judicial Approval
          </label>
          <select
            value={approvedFilter}
            onChange={(e) => setApprovedFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All (Approved & Unapproved)</option>
            <option value="false">⚠️ Unapproved Track Only</option>
            <option value="true">✓ Approved Only</option>
          </select>
        </div>

        {(trackFilter || statusFilter || approvedFilter) && (
          <button
            onClick={() => {
              setTrackFilter("");
              setStatusFilter("");
              setApprovedFilter("");
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold self-end pb-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-medium">Loading court registry matters...</p>
        </div>
      )}

      {/* Cases Table */}
      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {cases.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <span className="text-3xl">📂</span>
              <p className="text-sm font-semibold text-slate-700 mt-2">No cases found</p>
              <p className="text-xs text-slate-400 mt-1">
                No court matters match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Case Number</th>
                    <th className="px-4 py-3">Cause Title & Type</th>
                    <th className="px-4 py-3">Track</th>
                    <th className="px-4 py-3">Judicial Review</th>
                    <th className="px-4 py-3">Filing Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <Link to={`/cases/${c.id}`} className="hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.caseType}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getTrackBadge(
                            c.track?.name
                          )}`}
                        >
                          {c.track?.name} ({c.track?.targetDays}d)
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.trackApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <span>✓</span> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                            <span>⚠️</span> Unapproved
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">
                        {c.filingDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === "PENDING"
                              ? "bg-blue-100 text-blue-800"
                              : c.status === "LISTED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
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
