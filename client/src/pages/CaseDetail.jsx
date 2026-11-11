import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";

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
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Retrieving court dossier...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
        <h2 className="text-lg font-bold text-rose-800">Case Not Found</h2>
        <p className="text-xs text-rose-600 mt-1">{error || "Unable to locate matter."}</p>
        <Link
          to="/cases"
          className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
        >
          ← Return to Case Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link to="/cases" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
          ← Back to Master Registry
        </Link>
      </div>

      {/* Case Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-blue-700">
                {caseData.caseNumber}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  caseData.status === "PENDING"
                    ? "bg-blue-100 text-blue-800"
                    : caseData.status === "LISTED"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-slate-200 text-slate-800"
                }`}
              >
                {caseData.status}
              </span>
              {caseData.isUrgent && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  🚨 Urgent Matter
                </span>
              )}
              {caseData.isOverdue && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  🚨 Overdue Target
                </span>
              )}
              {caseData.isAging && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ⏳ Aging (&gt;5y)
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                ⚡ Priority: {Number(caseData.priorityScore || 0).toFixed(1)}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">{caseData.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>Case Type: {caseData.caseType}</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">
                {caseData.judge ? `${caseData.judge.courtroom} (${caseData.judge.user?.name})` : "Unassigned Bench"}
              </span>
            </div>
          </div>
          <div className="text-left md:text-right text-xs text-slate-500 space-y-1">
            <div>Filing Date: <strong className="text-slate-700 font-mono">{caseData.filingDate}</strong></div>
            <div>Target Disposal: <strong className="text-slate-700 font-mono">{caseData.targetDisposalDate}</strong></div>
            <div>Earliest Listing: <strong className="text-slate-700 font-mono">{caseData.earliestNextDate}</strong></div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">Complexity</span>
            <span className="font-bold text-slate-800 text-base">{caseData.complexity} pts</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">Active Track</span>
            <span className="font-bold text-blue-700 text-base">
              {caseData.track?.name} ({caseData.track?.targetDays}d)
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">Recommended</span>
            <span className="font-bold text-slate-700 text-base">
              {caseData.suggestedTrack?.name}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">Expert Evidence</span>
            <span className="font-bold text-slate-700 text-base">
              {caseData.hasExpertEvidence ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Feedback Alerts */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          ✓ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          ⚠️ {actionError}
        </div>
      )}

      {/* Track Review & Judicial Controls Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Judicial Track Classification
            </h2>
            <p className="text-xs text-slate-500">
              Human-in-the-loop judicial oversight: algorithms suggest, judicial officers decide.
            </p>
          </div>
          <div>
            {caseData.trackApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span>✓</span> Approved by Judge {caseData.trackApprovedBy?.name || "Bench"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                <span>⚠️</span> Awaiting Judicial Review
              </span>
            )}
          </div>
        </div>

        {/* Override Note if present */}
        {caseData.trackOverrideReason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <span className="font-bold">Track Override Justification:</span>{" "}
            {caseData.trackOverrideReason}
          </div>
        )}

        {/* Judicial Action Controls (Judge Only) */}
        {user?.role === "JUDGE" && caseData.status !== "DISPOSED" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bench Action Required (Judge Controls)
            </p>

            <div className="flex flex-wrap gap-3">
              {!caseData.trackApproved && (
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  ✓ Approve Suggested Track ({caseData.suggestedTrack?.name})
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowOverrideBox(!showOverrideBox)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
              >
                {showOverrideBox ? "Cancel Override" : "⚖️ Override Track Assignment"}
              </button>
            </div>

            {/* Override Form */}
            {showOverrideBox && (
              <form onSubmit={handleOverride} className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Judicial Track *
                    </label>
                    <select
                      required
                      value={overrideTrackId}
                      onChange={(e) => setOverrideTrackId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="">Select Alternative Track...</option>
                      {tracks
                        .filter((t) => t.id !== caseData.trackId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} Track ({t.targetDays} Days Target)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Documented Reason (Min 10 characters) *
                    </label>
                    <textarea
                      required
                      minLength={10}
                      rows={2}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g., Matter narrowed by joint memo; witness count reduced."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">
                      {overrideReason.length}/10 characters minimum
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingAction || overrideReason.trim().length < 10 || !overrideTrackId}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-40"
                >
                  {submittingAction ? "Recording Override..." : "Submit Judicial Override"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Litigants & Advocates Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Attached Litigants & Advocates ({caseData.parties?.length || 0})
        </h2>
        <div className="divide-y divide-slate-100 text-xs">
          {caseData.parties?.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-800">{p.name}</span>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                  p.role === "PETITIONER"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : p.role === "RESPONDENT"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hearing History — richer timeline with outcome, remarks, next date */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Hearing Schedule & Proceedings
        </h2>
        {(!caseData.hearings || caseData.hearings.length === 0) ? (
          <p className="text-xs text-slate-500 italic py-2">
            No court hearings scheduled yet. Matter will appear upon daily cause list generation.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {caseData.hearings.map((h) => {
              const outcomeBadge =
                h.outcome === "HEARD"     ? "bg-emerald-100 text-emerald-800" :
                h.outcome === "ADJOURNED" ? "bg-amber-100 text-amber-800" :
                h.outcome === "DISPOSED"  ? "bg-slate-200 text-slate-700" :
                                            "bg-blue-100 text-blue-800";
              return (
                <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-700">{h.hearingDate}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[11px] ${outcomeBadge}`}>
                      {h.outcome}
                    </span>
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
              );
            })}
          </div>
        )}
        {/* Next eligible listing date */}
        {caseData.status === "PENDING" && caseData.earliestNextDate && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
            <span className="font-bold">Earliest Next Listing: </span>
            <span className="font-mono">{caseData.earliestNextDate}</span>
            <span className="text-blue-600 ml-2">(statutory cooling gap enforced)</span>
          </div>
        )}
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Case Event Audit Trail
        </h2>
        <div className="divide-y divide-slate-100 text-xs">
          {caseData.auditLogs?.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="font-mono font-bold text-slate-800">{log.action}</span>
                <span className="text-slate-400 text-[11px] ml-2">by {log.user?.name || "System"}</span>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{log.details}</p>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

