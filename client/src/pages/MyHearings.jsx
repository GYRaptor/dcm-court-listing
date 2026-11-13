import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function MyHearings() {
  const { user } = useAuth();
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");

  // Per-hearing outcome UI state
  const [remarkInputs, setRemarkInputs] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [successMessages, setSuccessMessages] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [nextDates, setNextDates] = useState({});

  const fetchHearings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/hearings/mine");
      setHearings(res.hearings || []);
      setDate(res.date || "");
    } catch (err) {
      setError(err.message || "Failed to load today's hearings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHearings();
  }, []);

  const recordOutcome = async (hearingId, outcome) => {
    setSubmitting((s) => ({ ...s, [hearingId]: true }));
    setErrorMessages((e) => ({ ...e, [hearingId]: "" }));
    setSuccessMessages((s) => ({ ...s, [hearingId]: "" }));

    try {
      const res = await api.patch(`/hearings/${hearingId}/outcome`, {
        outcome,
        remarks: remarkInputs[hearingId] || undefined,
      });

      setSuccessMessages((s) => ({ ...s, [hearingId]: `Recorded: ${outcome}` }));
      setNextDates((n) => ({ ...n, [hearingId]: res.nextEligibleDate }));

      // Mark the hearing as completed locally
      setHearings((prev) =>
        prev.map((h) =>
          h.id === hearingId ? { ...h, outcome } : h
        )
      );
    } catch (err) {
      setErrorMessages((e) => ({ ...e, [hearingId]: err.message || "Failed to record outcome." }));
    } finally {
      setSubmitting((s) => ({ ...s, [hearingId]: false }));
    }
  };

  const pendingHearings = hearings.filter((h) => h.outcome === "SCHEDULED");
  const completedHearings = hearings.filter((h) => h.outcome !== "SCHEDULED");

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface border border-rule rounded-[4px] p-6 animate-pulse space-y-3">
            <div className="h-4 bg-rule/40 rounded w-1/3"></div>
            <div className="h-3 bg-rule/30 rounded w-1/2"></div>
            <div className="h-8 bg-rule/20 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Judicial bench cause list
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Listing date: <span className="font-mono tabular-nums font-semibold text-ink">{date}</span>
              {user?.judge && (
                <> &bull; Courtroom <span className="font-semibold text-ink">{user.judge.courtroom}</span></>
              )}
            </p>
          </div>
          <button
            onClick={fetchHearings}
            className="px-3 py-1 border border-rule text-ink hover:bg-paper text-xs font-mono rounded-[3px] transition self-start sm:self-auto"
          >
            Refresh docket
          </button>
        </div>
        <div className="rule-double"></div>
      </div>

      {error && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && hearings.length === 0 && (
        <div className="bg-surface border border-rule rounded-[4px] p-12 text-center text-muted space-y-2">
          <p className="font-serif text-base text-ink">No hearings listed for today.</p>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            Generate your daily cause list from the Cause List section to populate today's bench docket.
          </p>
        </div>
      )}

      {/* Pending hearings */}
      {pendingHearings.length > 0 && (
        <section aria-label="Awaiting hearing outcome" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-caps text-[11px] text-muted">
              Awaiting outcome ({pendingHearings.length})
            </h2>
          </div>
          {pendingHearings.map((h, index) => {
            const c = h.case;
            const petitioners = c?.parties?.filter((p) => p.role === "PETITIONER").map((p) => p.name).join(", ");
            const respondents = c?.parties?.filter((p) => p.role === "RESPONDENT").map((p) => p.name).join(", ");
            const isSubmitting = submitting[h.id];

            return (
              <div key={h.id} className="bg-surface border border-rule rounded-[4px] overflow-hidden">
                {/* Case Header */}
                <div className="p-4 border-b border-rule flex flex-col sm:flex-row sm:items-start gap-3 justify-between bg-paper/50">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-muted tabular-nums">Item {index + 1}</span>
                      <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                        {c?.caseNumber}
                      </span>
                      <StatusBadge track={c?.track?.name} />
                      {c?.isUrgent && <StatusBadge urgency="Urgent" />}
                    </div>
                    <p className="font-medium text-ink text-sm">{c?.title}</p>
                    <p className="text-xs text-muted">
                      {petitioners} <span className="text-muted/60 mx-1">vs</span> {respondents}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 text-xs font-mono tabular-nums text-muted">
                    <span>Priority: <strong className="text-ink">{c?.priorityScore?.toFixed(1)}</strong></span>
                    <span>Adjournments: <strong className="text-ink">{c?.adjournmentCount}</strong></span>
                    <Link
                      to={`/cases/${c?.id}`}
                      className="text-accent hover:underline text-xs mt-1"
                    >
                      Dossier &rarr;
                    </Link>
                  </div>
                </div>

                {/* Outcome Controls */}
                <div className="p-4 space-y-3">
                  <label className="block font-caps text-[11px] text-muted">
                    Bench remarks (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Judicial notes on proceedings, evidence filed, or directions..."
                    value={remarkInputs[h.id] || ""}
                    onChange={(e) =>
                      setRemarkInputs((r) => ({ ...r, [h.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-rule rounded-[3px] text-xs font-sans bg-paper text-ink focus:outline-none focus:border-accent resize-none"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "HEARD")}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition disabled:opacity-50"
                    >
                      Mark Heard
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "ADJOURNED")}
                      className="px-3 py-1.5 border border-rule text-ink hover:bg-paper text-xs font-medium rounded-[3px] transition disabled:opacity-50"
                    >
                      Adjourn
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "DISPOSED")}
                      className="px-3 py-1.5 border border-oxblood/40 text-oxblood hover:bg-oxblood-light text-xs font-medium rounded-[3px] transition disabled:opacity-50"
                    >
                      Dispose Matter
                    </button>
                  </div>

                  {errorMessages[h.id] && (
                    <p className="text-xs text-oxblood">{errorMessages[h.id]}</p>
                  )}
                  {successMessages[h.id] && (
                    <p className="text-xs text-accent font-medium font-mono">
                      {successMessages[h.id]}
                      {nextDates[h.id] && (
                        <> &bull; Earliest next listing: <span className="tabular-nums font-semibold">{nextDates[h.id]}</span></>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Completed hearings */}
      {completedHearings.length > 0 && (
        <section aria-label="Hearings completed today" className="space-y-3">
          <h2 className="font-caps text-[11px] text-muted">
            Completed today ({completedHearings.length})
          </h2>
          <div className="bg-surface border border-rule rounded-[4px] divide-y divide-rule overflow-hidden">
            {completedHearings.map((h) => {
              const c = h.case;
              return (
                <div key={h.id} className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-paper/40 transition-colors duration-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-ink tabular-nums shrink-0">
                      {c?.caseNumber}
                    </span>
                    <span className="text-xs text-ink truncate">{c?.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {h.remarks && (
                      <span className="text-xs text-muted italic truncate max-w-[200px]" title={h.remarks}>
                        &ldquo;{h.remarks}&rdquo;
                      </span>
                    )}
                    <StatusBadge outcome={h.outcome} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}