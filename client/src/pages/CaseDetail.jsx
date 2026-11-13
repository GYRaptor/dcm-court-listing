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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-4 bg-rule/40 rounded w-28 animate-pulse"></div>
        <div className="bg-surface border border-rule rounded-[4px] p-6 animate-pulse space-y-4">
          <div className="h-6 bg-rule/40 rounded w-1/3"></div>
          <div className="h-4 bg-rule/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-surface border border-rule rounded-[4px] text-center">
        <h2 className="text-base font-serif font-semibold text-oxblood">Matter Not Found</h2>
        <p className="text-xs text-muted mt-1">{error || "Unable to locate court matter."}</p>
        <Link
          to="/cases"
          className="mt-4 inline-block px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface rounded-[3px] text-xs font-medium transition"
        >
          &larr; Return to Case Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link to="/cases" className="text-xs font-mono text-accent hover:underline">
          &larr; Back to master registry
        </Link>
      </div>

      {/* Case Header Card */}
      <div className="bg-surface border border-rule rounded-[4px] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-rule pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xl font-bold text-accent tabular-nums">
                {caseData.caseNumber}
              </span>
              <StatusBadge status={caseData.status} />
              {caseData.isUrgent && <StatusBadge urgency="Urgent" />}
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
              <span className="font-mono text-xs tabular-nums text-muted">
                Priority: <strong className="text-ink">{Number(caseData.priorityScore || 0).toFixed(1)}</strong>
              </span>
            </div>
            <h1 className="text-xl font-serif text-ink mt-2">{caseData.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-mono mt-1">
              <span>Type: {caseData.caseType}</span>
              <span>&bull;</span>
              <span>
                {caseData.judge ? `${caseData.judge.courtroom} (${caseData.judge.user?.name})` : "Unassigned Bench"}
              </span>
            </div>
          </div>
          <div className="text-left md:text-right text-xs font-mono tabular-nums text-muted space-y-0.5 shrink-0">
            <div>Filing: <strong className="text-ink">{caseData.filingDate}</strong></div>
            <div>Target: <strong className="text-ink">{caseData.targetDisposalDate}</strong></div>
            <div>Earliest: <strong className="text-accent">{caseData.earliestNextDate}</strong></div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-rule border border-rule bg-paper rounded-[3px] text-center p-3">
          <div className="p-2">
            <span className="font-caps text-[11px] text-muted block mb-0.5">Complexity</span>
            <span className="font-mono font-semibold text-ink text-sm sm:text-base tabular-nums">{caseData.complexity} pts</span>
          </div>
          <div className="p-2">
            <span className="font-caps text-[11px] text-muted block mb-0.5">Active Track</span>
            <span className="font-mono font-bold text-accent text-sm sm:text-base tabular-nums">
              {caseData.track?.name} ({caseData.track?.targetDays}d)
            </span>
          </div>
          <div className="p-2">
            <span className="font-caps text-[11px] text-muted block mb-0.5">Recommended</span>
            <span className="font-mono font-semibold text-ink text-sm sm:text-base">
              {caseData.suggestedTrack?.name}
            </span>
          </div>
          <div className="p-2">
            <span className="font-caps text-[11px] text-muted block mb-0.5">Expert Evidence</span>
            <span className="font-mono font-semibold text-ink text-sm sm:text-base">
              {caseData.hasExpertEvidence ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Feedback Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-surface border border-rule text-ink rounded-[4px] text-xs font-medium">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {actionError}
        </div>
      )}

      {/* Track Review & Judicial Controls */}
      <section
        aria-label="Judicial track classification"
        className="bg-surface border border-rule rounded-[4px] p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-rule pb-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-ink">
              Judicial track classification
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Human-in-the-loop oversight: algorithmic suggestions confirmed by judicial authority.
            </p>
          </div>
          <div>
            {caseData.trackApproved ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                Approved by {caseData.trackApprovedBy?.name || "Bench"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-ochre font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-ochre"></span>
                Awaiting judicial review
              </span>
            )}
          </div>
        </div>

        {/* Override Note */}
        {caseData.trackOverrideReason && (
          <div className="p-3 bg-paper border border-rule rounded-[3px] text-xs text-ink">
            <span className="font-semibold">Track override rationale:</span>{" "}
            &ldquo;{caseData.trackOverrideReason}&rdquo;
          </div>
        )}

        {/* Judicial Action Controls */}
        {user?.role === "JUDGE" && caseData.status !== "DISPOSED" && (
          <div className="bg-paper border border-rule rounded-[3px] p-4 space-y-3">
            <p className="font-caps text-[11px] text-muted">
              Bench controls
            </p>

            <div className="flex flex-wrap gap-2">
              {!caseData.trackApproved && (
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleApprove}
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface rounded-[3px] text-xs font-medium transition disabled:opacity-50"
                >
                  Approve Suggested Track ({caseData.suggestedTrack?.name})
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowOverrideBox(!showOverrideBox)}
                className="px-3.5 py-1.5 border border-rule text-ink hover:bg-surface rounded-[3px] text-xs font-medium transition"
              >
                {showOverrideBox ? "Cancel override" : "Override track assignment"}
              </button>
            </div>

            {/* Override Form */}
            {showOverrideBox && (
              <form onSubmit={handleOverride} className="mt-4 pt-4 border-t border-rule space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-caps text-[11px] text-muted mb-1">
                      Target Judicial Track *
                    </label>
                    <select
                      required
                      value={overrideTrackId}
                      onChange={(e) => setOverrideTrackId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-rule rounded-[3px] text-xs font-sans bg-surface text-ink focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Alternative Track...</option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} Track ({t.targetDays}d target, {t.gapDays}d cooling gap)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-caps text-[11px] text-muted mb-1">
                      Mandatory Judicial Rationale (min 10 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={10}
                      placeholder="e.g., Matter involves consolidated multi-state appeals"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-rule rounded-[3px] text-xs font-sans bg-surface text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface rounded-[3px] text-xs font-medium transition disabled:opacity-50"
                  >
                    {submittingAction ? "Recording override..." : "Confirm judicial override"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Litigants & Advocates */}
      <section
        aria-label="Attached litigants and advocates"
        className="bg-surface border border-rule rounded-[4px] p-6 space-y-3"
      >
        <h2 className="font-caps text-[11px] text-muted">
          Attached litigants &amp; advocates ({caseData.parties?.length || 0})
        </h2>
        <div className="divide-y divide-rule text-xs">
          {caseData.parties?.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-ink">{p.name}</span>
              <span className="font-mono text-[10px] text-muted uppercase">
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Hearing Schedule & Proceedings */}
      <section
        aria-label="Hearing schedule and proceedings"
        className="bg-surface border border-rule rounded-[4px] p-6 space-y-3"
      >
        <h2 className="font-caps text-[11px] text-muted">
          Hearing schedule &amp; proceedings
        </h2>
        {(!caseData.hearings || caseData.hearings.length === 0) ? (
          <p className="text-xs text-muted italic py-2">
            No court hearings scheduled yet. Matter will appear upon daily cause list generation.
          </p>
        ) : (
          <div className="divide-y divide-rule">
            {caseData.hearings.map((h) => (
              <div key={h.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-medium text-ink tabular-nums">{h.hearingDate}</span>
                  <StatusBadge outcome={h.outcome} />
                  {h.remarks && (
                    <span className="italic text-muted max-w-xs truncate" title={h.remarks}>
                      &ldquo;{h.remarks}&rdquo;
                    </span>
                  )}
                </div>
                {h.judge && (
                  <span className="text-[11px] text-muted shrink-0">
                    Presided: {h.judge?.user?.name || "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {caseData.status === "PENDING" && caseData.earliestNextDate && (
          <div className="mt-2 p-3 bg-paper border border-rule rounded-[3px] text-xs text-ink font-mono">
            <span>Earliest next listing: </span>
            <span className="tabular-nums font-semibold text-accent">{caseData.earliestNextDate}</span>
            <span className="text-muted ml-2">(cooling gap enforced)</span>
          </div>
        )}
      </section>

      {/* Audit Log Timeline */}
      <section
        aria-label="Case event audit trail"
        className="bg-surface border border-rule rounded-[4px] p-6 space-y-3"
      >
        <h2 className="font-caps text-[11px] text-muted">
          Case event audit trail
        </h2>
        <div className="divide-y divide-rule text-xs">
          {caseData.auditLogs?.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="font-mono font-medium text-ink">{log.action}</span>
                <span className="text-muted text-[11px] ml-2">by {log.user?.name || "System"}</span>
                <p className="text-[11px] text-muted font-mono mt-0.5">{log.details}</p>
              </div>
              <span className="text-[10px] text-muted whitespace-nowrap font-mono tabular-nums">
                {new Date(log.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}