import React, { useState } from "react";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
          Public case lookup
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed">
          Inspect listing status, assigned DCFM track, and scheduled hearing proceedings by case number.
        </p>
        <div className="rule-double max-w-xl mx-auto mt-4"></div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <input
          type="text"
          required
          placeholder="e.g. DCM/2026/0001"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
          className="flex-1 px-3.5 py-2 bg-paper border border-rule rounded-[3px] text-xs sm:text-sm font-mono uppercase tracking-wider tabular-nums text-ink focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-surface font-medium text-xs sm:text-sm rounded-[3px] transition disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search case"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="max-w-xl mx-auto p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs text-center">
          <p className="font-semibold">Matter not found</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="max-w-xl mx-auto p-6 bg-surface border border-rule rounded-[4px] animate-pulse space-y-3">
          <div className="h-4 bg-rule/40 rounded w-1/3 mx-auto"></div>
          <div className="h-3 bg-rule/20 rounded w-2/3 mx-auto"></div>
        </div>
      )}

      {/* Read-Only Docket Card */}
      {!loading && caseData && (
        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden space-y-6">
          {/* Header Banner */}
          <div className="p-5 bg-paper border-b border-rule flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold text-accent tabular-nums">
                  {caseData.caseNumber}
                </span>
                <StatusBadge status={caseData.status} />
                {caseData.isOverdue && (
                  <span className="text-[10px] font-mono text-oxblood font-semibold">
                    [Overdue]
                  </span>
                )}
                {caseData.isAging && (
                  <span className="text-[10px] font-mono text-ochre font-semibold">
                    [Aging &gt;5y]
                  </span>
                )}
              </div>
              <h2 className="text-base font-serif font-semibold text-ink mt-1.5">{caseData.title}</h2>
              <p className="text-xs text-muted mt-0.5 font-sans">Case type: <span className="font-medium text-ink">{caseData.caseType}</span></p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="font-caps text-[11px] text-muted block mb-1">
                Assigned Track
              </span>
              <StatusBadge track={caseData.track?.name} />
            </div>
          </div>

          {/* Key Procedural Timelines */}
          <div className="px-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule border border-rule rounded-[3px] bg-paper text-center">
              <div className="p-3">
                <span className="font-caps text-[11px] text-muted block mb-0.5">
                  Filing Date
                </span>
                <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                  {caseData.filingDate}
                </span>
              </div>
              <div className="p-3">
                <span className="font-caps text-[11px] text-accent block mb-0.5">
                  Earliest Next Listing
                </span>
                <span className="font-mono text-xs font-bold text-accent tabular-nums">
                  {caseData.earliestNextDate}
                </span>
              </div>
              <div className="p-3">
                <span className="font-caps text-[11px] text-muted block mb-0.5">
                  Target Disposal Deadline
                </span>
                <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                  {caseData.targetDisposalDate}
                </span>
              </div>
            </div>
          </div>

          {/* Litigants */}
          <div className="px-5 space-y-2">
            <h3 className="font-caps text-[11px] text-muted">
              Parties of record
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {caseData.parties?.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-[3px] border border-rule bg-paper/50"
                >
                  <span className="font-medium text-ink truncate mr-2">{p.name}</span>
                  <span className="font-caps text-[10px] text-muted">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hearing History Timeline */}
          <div className="p-5 pt-0 space-y-2">
            <h3 className="font-caps text-[11px] text-muted">
              Court proceedings history
            </h3>
            {!caseData.hearings || caseData.hearings.length === 0 ? (
              <p className="text-xs text-muted italic">
                No past hearings on record. Case will be listed according to priority score.
              </p>
            ) : (
              <div className="border border-rule rounded-[3px] divide-y divide-rule overflow-hidden">
                {caseData.hearings.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3.5 py-2 text-xs bg-paper/30"
                  >
                    <span className="font-mono text-ink tabular-nums">{h.hearingDate}</span>
                    <StatusBadge outcome={h.outcome} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State Helper */}
      {!searched && !loading && (
        <div className="p-6 text-center text-muted border border-rule rounded-[4px] bg-surface">
          <p className="text-xs text-muted font-sans">
            Enter an institutional identifier (e.g. <strong className="text-ink font-mono tabular-nums">DCM/2026/0001</strong>) to retrieve verified proceedings.
          </p>
        </div>
      )}
    </div>
  );
}