import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";

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

  const getTrackBadge = (trackName) => {
    switch (trackName) {
      case "FAST":    return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "STANDARD": return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
      case "COMPLEX": return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      default:        return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
    }
  };

  const getOutcomePill = (outcome) => {
    switch (outcome) {
      case "HEARD":    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
      case "ADJOURNED": return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
      case "DISPOSED": return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/10";
      default:         return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
    }
  };

  const pendingHearings = hearings.filter((h) => h.outcome === "SCHEDULED");
  const completedHearings = hearings.filter((h) => h.outcome !== "SCHEDULED");

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-3">
            <div className="h-4 bg-slate-200/70 rounded w-1/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            <div className="h-8 bg-slate-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">⚖️ Judicial Bench — Today's Cause List</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Listing Date: <span className="font-mono font-medium text-slate-700 tabular-nums">{date}</span>
              {user?.judge && (
                <> &nbsp;•&nbsp; Courtroom <span className="font-semibold text-slate-800">{user.judge.courtroom}</span></>
              )}
            </p>
          </div>
          <button
            onClick={fetchHearings}
            className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && hearings.length === 0 && (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-2">
          <span className="text-3xl">📭</span>
          <p className="font-semibold text-sm text-slate-700">No hearings listed for today.</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Generate your daily cause list from the Cause List page to populate today's bench docket.
          </p>
        </div>
      )}

      {/* Pending hearings — action required */}
      {pendingHearings.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Awaiting Outcome ({pendingHearings.length})
          </h2>
          {pendingHearings.map((h, index) => {
            const c = h.case;
            const petitioners = c?.parties?.filter((p) => p.role === "PETITIONER").map((p) => p.name).join(", ");
            const respondents = c?.parties?.filter((p) => p.role === "RESPONDENT").map((p) => p.name).join(", ");
            const isSubmitting = submitting[h.id];

            return (
              <div key={h.id} className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
                {/* Case Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">Item {index + 1}</span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                        {c?.caseNumber}
                      </span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${getTrackBadge(c?.track?.name)}`}>
                        {c?.track?.name}
                      </span>
                      {c?.isUrgent && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-900 text-sm">{c?.title}</p>
                    <p className="text-xs text-slate-500">
                      {petitioners} <span className="text-slate-400 mx-1">vs</span> {respondents}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 text-xs text-slate-500">
                    <span>Priority: <span className="font-mono font-semibold text-slate-800 tabular-nums">{c?.priorityScore?.toFixed(1)}</span></span>
                    <span>Adjournments: <span className="font-semibold text-slate-700 tabular-nums">{c?.adjournmentCount}</span></span>
                    <Link
                      to={`/cases/${c?.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium transition mt-1"
                    >
                      View Full Dossier →
                    </Link>
                  </div>
                </div>

                {/* Outcome Controls */}
                <div className="p-5 bg-slate-50/50 space-y-3">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Bench Remarks (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Judicial notes on proceedings, evidence filed, or directions..."
                    value={remarkInputs[h.id] || ""}
                    onChange={(e) =>
                      setRemarkInputs((r) => ({ ...r, [h.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition resize-none shadow-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "HEARD")}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition"
                    >
                      ✓ Mark HEARD
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "ADJOURNED")}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition"
                    >
                      ↻ ADJOURN
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => recordOutcome(h.id, "DISPOSED")}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition"
                    >
                      ✕ DISPOSE
                    </button>
                  </div>

                  {errorMessages[h.id] && (
                    <p className="text-xs text-rose-600 font-medium">{errorMessages[h.id]}</p>
                  )}
                  {successMessages[h.id] && (
                    <p className="text-xs text-emerald-700 font-semibold">
                      {successMessages[h.id]}
                      {nextDates[h.id] && (
                        <> — Earliest Next Listing: <span className="font-mono tabular-nums">{nextDates[h.id]}</span></>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Completed hearings — read-only summary */}
      {completedHearings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Completed Today ({completedHearings.length})
          </h2>
          <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            {completedHearings.map((h) => {
              const c = h.case;
              return (
                <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-700 tabular-nums shrink-0">
                      {c?.caseNumber}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-700 truncate">{c?.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {h.remarks && (
                      <span className="text-xs text-slate-400 italic truncate max-w-[180px]" title={h.remarks}>
                        "{h.remarks}"
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium font-mono uppercase ${getOutcomePill(h.outcome)}`}>
                      {h.outcome}
                    </span>
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
