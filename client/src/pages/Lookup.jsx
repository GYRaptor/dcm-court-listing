import React, { useState } from "react";
import api from "../api.js";

export default function Lookup() {
  const [searchNumber, setSearchNumber] = useState("");
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchNumber.trim();
    if (!query) return;

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const res = await api.get(`/cases/lookup/${encodeURIComponent(query)}`);
      setCaseData(res.case);
    } catch (err) {
      setCaseData(null);
      setError(err.message || "No court matter found with that case number.");
    } finally {
      setLoading(false);
    }
  };

  const quickSearch = (num) => {
    setSearchNumber(num);
    setError("");
    setSearched(true);
    setLoading(true);

    api
      .get(`/cases/lookup/${encodeURIComponent(num)}`)
      .then((res) => setCaseData(res.case))
      .catch((err) => {
        setCaseData(null);
        setError(err.message || "Matter not found.");
      })
      .finally(() => setLoading(false));
  };

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <span className="text-3xl">🏛️</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Public Case Docket Lookup
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Enter an institutional case filing number to inspect current listing status, assigned DCFM track, and scheduled hearing proceedings.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <input
          type="text"
          required
          placeholder="e.g. DCM/2026/0001"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono uppercase tracking-wider tabular-nums shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search Docket"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="max-w-xl mx-auto p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm text-center">
          <p className="font-semibold text-rose-900">Matter Not Found</p>
          <p className="text-rose-600 mt-0.5">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="max-w-xl mx-auto p-8 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-4">
          <div className="h-6 bg-slate-200/70 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-2/3"></div>
          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="h-14 bg-slate-100 rounded-lg"></div>
            <div className="h-14 bg-slate-100 rounded-lg"></div>
            <div className="h-14 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      )}

      {/* Read-Only Docket Card */}
      {!loading && caseData && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold text-blue-400 tabular-nums">
                  {caseData.caseNumber}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    caseData.status === "PENDING"
                      ? "bg-blue-500/10 text-blue-300 ring-blue-400/20"
                      : caseData.status === "LISTED"
                      ? "bg-purple-500/10 text-purple-300 ring-purple-400/20"
                      : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                  }`}
                >
                  {caseData.status}
                </span>
                {caseData.isOverdue && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/30">
                    Overdue
                  </span>
                )}
                {caseData.isAging && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/30">
                    Aging (&gt;5y)
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-100 mt-1.5">{caseData.title}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Matter Type: {caseData.caseType}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Assigned Track
              </span>
              <span
                className={`inline-flex items-center rounded-md mt-1 px-2.5 py-1 text-xs font-medium ${getTrackBadge(
                  caseData.track?.name
                )}`}
              >
                {caseData.track?.name} Track ({caseData.track?.targetDays}d target)
              </span>
            </div>
          </div>

          {/* Key Procedural Timelines */}
          <div className="p-5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">
                Filing Date
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 tabular-nums">
                {caseData.filingDate}
              </span>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/70">
              <span className="text-[11px] uppercase font-semibold text-blue-700 block">
                Earliest Next Listing
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-900 tabular-nums">
                {caseData.earliestNextDate}
              </span>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
              <span className="text-[11px] uppercase font-semibold text-slate-500 block">
                Target Disposal Deadline
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 tabular-nums">
                {caseData.targetDisposalDate}
              </span>
            </div>
          </div>

          {/* Litigants Card */}
          <div className="p-5 border-b border-slate-100 space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Parties of Record
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {caseData.parties?.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <span className="font-medium text-slate-800 truncate mr-2">{p.name}</span>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium font-mono ring-1 ring-inset ${
                      p.role === "PETITIONER"
                        ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                        : p.role === "RESPONDENT"
                        ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                        : "bg-slate-50 text-slate-700 ring-slate-600/20"
                    }`}
                  >
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hearing History Timeline */}
          <div className="p-5 space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Court Proceedings History
            </h3>
            {!caseData.hearings || caseData.hearings.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No past hearings on record. Matter will be listed according to statutory priority score.
              </p>
            ) : (
              <div className="space-y-2">
                {caseData.hearings.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50/70 text-xs border border-slate-100"
                  >
                    <span className="font-mono text-slate-700 tabular-nums">{h.hearingDate}</span>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase font-mono bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/10">
                      {h.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State Helper */}
      {!searched && !loading && (
        <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <p className="text-xs leading-relaxed">
            Enter an institutional court identifier (format: <strong className="font-mono text-slate-600">DCM/YYYY/XXXX</strong>) to retrieve verified proceedings.
          </p>
        </div>
      )}
    </div>
  );
}
