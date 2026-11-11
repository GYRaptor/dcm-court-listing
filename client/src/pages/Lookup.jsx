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
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "STANDARD":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "COMPLEX":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <span className="text-4xl">🏛️</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Public Case Docket Lookup
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Enter your institutional case filing number to review current listing status, assigned DCFM track, and upcoming court dates.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <input
          type="text"
          required
          placeholder="e.g., DCM/2026/0001"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search Docket"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="max-w-xl mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm text-center">
          <p className="font-semibold">Matter Not Found</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="max-w-xl mx-auto p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-7 w-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Fetching verified court docket...</p>
        </div>
      )}

      {/* Read-Only Docket Card */}
      {!loading && caseData && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-blue-400">
                  {caseData.caseNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    caseData.status === "PENDING"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                      : caseData.status === "LISTED"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {caseData.status}
                </span>
                {caseData.isOverdue && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                    🚨 Overdue Target
                  </span>
                )}
                {caseData.isAging && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                    ⏳ Aging Matter (&gt;5y)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">{caseData.title}</h2>
              <p className="text-xs text-slate-400 font-mono">Case Type: {caseData.caseType}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Assigned DCFM Track
              </span>
              <span
                className={`inline-block mt-1 px-3 py-1 rounded-lg text-xs font-bold border ${getTrackBadge(
                  caseData.track?.name
                )}`}
              >
                {caseData.track?.name} Track ({caseData.track?.targetDays} Days Target)
              </span>
            </div>
          </div>

          {/* Key Procedural Timelines */}
          <div className="p-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Filing Date
              </span>
              <span className="font-mono text-sm font-semibold text-slate-800">
                {caseData.filingDate}
              </span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">
                Earliest Next Listing
              </span>
              <span className="font-mono text-sm font-bold text-blue-900">
                {caseData.earliestNextDate}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Target Disposal Deadline
              </span>
              <span className="font-mono text-sm font-semibold text-slate-800">
                {caseData.targetDisposalDate}
              </span>
            </div>
          </div>

          {/* Litigants Card */}
          <div className="p-6 border-b border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Parties of Record
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {caseData.parties?.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50"
                >
                  <span className="font-semibold text-slate-800 truncate mr-2">{p.name}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      p.role === "PETITIONER"
                        ? "bg-blue-100 text-blue-800"
                        : p.role === "RESPONDENT"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hearing History Timeline */}
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Court Proceedings History
            </h3>
            {!caseData.hearings || caseData.hearings.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No past hearings on record. Matter will be listed according to priority.
              </p>
            ) : (
              <div className="space-y-2">
                {caseData.hearings.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-lg bg-slate-50 text-xs border border-slate-100"
                  >
                    <span className="font-mono font-medium text-slate-700">{h.hearingDate}</span>
                    <span className="font-bold text-slate-800">{h.outcome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State Helper */}
      {!searched && !loading && (
        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <p className="text-xs">
            Tip: Try searching for newly registered cases using the format <strong>DCM/YYYY/XXXX</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
