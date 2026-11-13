import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Judge Override Form State
  const [overrideTrackId, setOverrideTrackId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showOverrideBox, setShowOverrideBox] = useState(false);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/cases/${id}`);
      setCaseData(res.case);
    } catch (err) {
      setError(err.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const res = await api.get("/cases/tracks");
      setTracks(res.tracks || []);
    } catch (err) {
      console.warn("Failed to load tracks list", err);
    }
  };

  useEffect(() => {
    fetchCase();
    if (user?.role === "JUDGE") {
      fetchTracks();
    }
  }, [id, user?.role]);

  // Handle Judge Approval
  const handleApprove = async () => {
    setActionError("");
    setActionSuccess("");
    setSubmittingAction(true);
    try {
      const res = await api.patch(`/cases/${id}/track`, { action: "APPROVE" });
      setActionSuccess("Track successfully approved under judicial authority.");
      setCaseData(res.case);
      setShowOverrideBox(false);
    } catch (err) {
      setActionError(err.message || "Failed to approve track");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Judge Override
  const handleOverride = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!overrideTrackId) {
      setActionError("Please select a target track.");
      return;
    }
    if (overrideReason.trim().length < 10) {
      setActionError("Justification reason must be at least 10 characters long.");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await api.patch(`/cases/${id}/track`, {
        action: "OVERRIDE",
        trackId: overrideTrackId,
        reason: overrideReason,
      });
      setActionSuccess("Track overridden and target disposal date updated.");
      setCaseData(res.case);
      setOverrideReason("");
      setShowOverrideBox(false);
    } catch (err) {
      setActionError(err.message || "Failed to override track");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
        <div className="h-4 bg-slate-200/70 rounded w-28 animate-pulse"></div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-4">
          <div className="h-6 bg-slate-200/70 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-3 pt-2">
            <div className="h-14 bg-slate-100 rounded-lg"></div>
            <div className="h-14 bg-slate-100 rounded-lg"></div>
            <div className="h-14 bg-slate-100 rounded-lg"></div>
            <div className="h-14 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-rose-50/70 border border-rose-200/80 rounded-xl text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-rose-900">Case Not Found</h2>
        <p className="text-xs text-rose-600 mt-1">{error || "Unable to locate matter."}</p>
        <Link
          to="/cases"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-sm transition active:scale-[0.98]"
        >
          ← Return to Case Registry
        </Link>
      </div>
    );
  }

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link to="/cases" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition">
          ← Back to Master Registry
        </Link>
      </div>

      {/* Case Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg sm:text-xl font-bold text-blue-700 tabular-nums">
                {caseData.caseNumber}
              </span>
              <StatusBadge status={caseData.status} />
              {caseData.isUrgent && <StatusBadge urgency="Urgent" />}
              {caseData.isOverdue && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  Overdue
                </span>
              )}
              {caseData.isAging && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Aging (&gt;5y)
                </span>
              )}
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold tabular-nums bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                ⚡ Priority: {Number(caseData.priorityScore || 0).toFixed(1)}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 mt-1.5">{caseData.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>Case Type: {caseData.caseType}</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">
                {caseData.judge ? `${caseData.judge.courtroom} (${caseData.judge.user?.name})` : "Unassigned Bench"}
              </span>
            </div>
          </div>
          <div className="text-left md:text-right text-xs text-slate-500 space-y-1">
            <div>Filing Date: <strong className="text-slate-700 font-mono tabular-nums">{caseData.filingDate}</strong></div>
            <div>Target Disposal: <strong className="text-slate-700 font-mono tabular-nums">{caseData.targetDisposalDate}</strong></div>
            <div>Earliest Listing: <strong className="text-slate-700 font-mono tabular-nums">{caseData.earliestNextDate}</strong></div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Complexity</span>
            <span className="font-bold text-slate-800 text-sm sm:text-base tabular-nums">{caseData.complexity} pts</span>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Active Track</span>
            <span className="font-bold text-blue-700 text-sm sm:text-base tabular-nums">
              {caseData.track?.name} ({caseData.track?.targetDays}d)
            </span>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Recommended</span>
            <span className="font-bold text-slate-700 text-sm sm:text-base">
              {caseData.suggestedTrack?.name}
            </span>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Expert Evidence</span>
            <span className="font-bold text-slate-700 text-sm sm:text-base">
              {caseData.hasExpertEvidence ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Feedback Alerts */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
          ✓ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm font-medium">
          ⚠️ {actionError}
        </div>
      )}

      {/* Track Review & Judicial Controls Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Judicial Track Classification
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Human-in-the-loop oversight: algorithms suggest, judicial officers confirm.
            </p>
          </div>
          <div>
            {caseData.trackApproved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span>✓</span> Approved by {caseData.trackApprovedBy?.name || "Bench"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 animate-pulse">
                <span>⚠️</span> Awaiting Judicial Review
              </span>
            )}
          </div>
        </div>

        {/* Override Note if present */}
        {caseData.trackOverrideReason && (
          <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-lg text-xs text-purple-900">
            <span className="font-semibold">Track Override Justification:</span>{" "}
            {caseData.trackOverrideReason}
          </div>
        )}

        {/* Judicial Action Controls (Judge Only) */}
        {user?.role === "JUDGE" && caseData.status !== "DISPOSED" && (
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Bench Judicial Controls
            </p>

            <div className="flex flex-wrap gap-2.5">
              {!caseData.trackApproved && (
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleApprove}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                >
                  ✓ Approve Suggested Track ({caseData.suggestedTrack?.name})
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowOverrideBox(!showOverrideBox)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-lg text-xs font-medium shadow-sm transition"
              >
                {showOverrideBox ? "Cancel Override" : "⚖️ Override Track Assignment"}
              </button>
            </div>

            {/* Override Form */}
            {showOverrideBox && (
              <form onSubmit={handleOverride} className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target Judicial Track *
                    </label>
                    <select
                      required
                      value={overrideTrackId}
                      onChange={(e) => setOverrideTrackId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    >
                      <option value="">Select Alternative Track...</option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} Track ({t.targetDays} Days Target, {t.gapDays}d Cooling Gap)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mandatory Judicial Rationale (min 10 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={10}
                      placeholder="e.g., Matter involves consolidated multi-state appeals"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white rounded-lg text-xs font-medium shadow-sm transition disabled:opacity-50"
                  >
                    {submittingAction ? "Recording Override..." : "Confirm Judicial Override"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Litigants & Advocates Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Attached Litigants & Advocates ({caseData.parties?.length || 0})
        </h2>
        <div className="divide-y divide-slate-100 text-xs">
          {caseData.parties?.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-800">{p.name}</span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium ring-1 ring-inset ${
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

      {/* Hearing Schedule & Proceedings */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Hearing Schedule & Proceedings
        </h2>
        {(!caseData.hearings || caseData.hearings.length === 0) ? (
          <p className="text-xs text-slate-400 italic py-2">
            No court hearings scheduled yet. Matter will appear upon daily cause list generation.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {caseData.hearings.map((h) => (
              <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium text-slate-700 tabular-nums">{h.hearingDate}</span>
                  <StatusBadge outcome={h.outcome} />
                  {h.remarks && (
                    <span className="italic text-slate-400 max-w-xs truncate" title={h.remarks}>
                      "{h.remarks}"
                    </span>
                  )}
                </div>
                {h.judge && (
                  <span className="text-[11px] text-slate-400 shrink-0">
                    Presided: {h.judge?.user?.name || "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Next eligible listing date */}
        {caseData.status === "PENDING" && caseData.earliestNextDate && (
          <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100/70 rounded-lg text-xs text-blue-800">
            <span className="font-semibold">Earliest Next Listing: </span>
            <span className="font-mono tabular-nums font-bold">{caseData.earliestNextDate}</span>
            <span className="text-blue-600 ml-2">(statutory cooling gap enforced)</span>
          </div>
        )}
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Case Event Audit Trail
        </h2>
        <div className="divide-y divide-slate-100 text-xs">
          {caseData.auditLogs?.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="font-mono font-medium text-slate-800">{log.action}</span>
                <span className="text-slate-400 text-[11px] ml-2">by {log.user?.name || "System"}</span>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{log.details}</p>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono tabular-nums">
                {new Date(log.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
