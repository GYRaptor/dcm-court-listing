import React, { useState, useEffect } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function CauseList() {
  const { user } = useAuth();
  const [judges, setJudges] = useState([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [causeListData, setCauseListData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load active judges
  useEffect(() => {
    api
      .get("/judges")
      .then((res) => {
        const list = res.judges || [];
        setJudges(list);
        if (user?.judge) {
          setSelectedJudgeId(user.judge.id);
        } else if (list.length > 0) {
          setSelectedJudgeId(list[0].id);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load judges roster.");
      });
  }, [user]);

  // Fetch or view existing cause list
  const handleFetchList = async () => {
    if (!selectedJudgeId || !selectedDate) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await api.get(
        `/cause-list?judgeId=${selectedJudgeId}&date=${selectedDate}`
      );
      setCauseListData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch cause list.");
    } finally {
      setLoading(false);
    }
  };

  // Generate cause list (idempotent POST)
  const handleGenerate = async () => {
    if (!selectedJudgeId || !selectedDate) return;
    setGenerating(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await api.post("/cause-list", {
        judgeId: selectedJudgeId,
        date: selectedDate,
      });
      setCauseListData(data);
      if (data.alreadyGenerated) {
        setSuccessMsg("Retrieved previously generated cause list (idempotent record).");
      } else {
        setSuccessMsg(
          `Successfully scheduled ${data.count} case(s) for Courtroom ${data.judge?.courtroom}.`
        );
      }
    } catch (err) {
      setError(err.message || "Failed to generate cause list.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Daily cause list generator
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Selects priority-ranked pending cases within courtroom capacity and enforces cooling gaps.
            </p>
          </div>
        </div>
        <div className="rule-double"></div>
      </div>

      {/* Control Bar */}
      <section
        aria-label="Cause list generator parameters"
        className="bg-surface border border-rule rounded-[4px] p-4"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4 w-full md:w-auto">
            {/* Judge Selector */}
            <div className="flex-1 sm:flex-initial">
              <label className="block font-caps text-[11px] text-muted mb-1">
                Courtroom / Judge
              </label>
              <select
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 border border-rule rounded-[3px] text-xs font-sans bg-paper text-ink focus:outline-none focus:border-accent"
              >
                {judges.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.courtroom} — {j.user?.name} (Cap: {j.dailyCapacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex-1 sm:flex-initial">
              <label className="block font-caps text-[11px] text-muted mb-1">
                Listing Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 border border-rule rounded-[3px] text-xs font-mono tabular-nums bg-paper text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <button
              onClick={handleFetchList}
              disabled={loading || generating}
              className="px-3.5 py-1.5 border border-rule text-ink hover:bg-paper rounded-[3px] text-xs font-medium transition disabled:opacity-50"
            >
              {loading ? "Checking..." : "View existing"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || loading}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition disabled:opacity-50"
            >
              {generating ? "Scheduling..." : "Generate cause list"}
            </button>
          </div>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-surface border border-rule text-ink rounded-[4px] text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* Cause List Docket Display */}
      {causeListData && (
        <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
          {/* Header metadata */}
          <div className="p-4 bg-paper border-b border-rule flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-serif font-semibold text-ink">
                Cause List: Courtroom {causeListData.judge?.courtroom}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Presiding: {causeListData.judge?.user?.name} &bull; Listing Date:{" "}
                <span className="font-mono tabular-nums font-semibold text-ink">
                  {causeListData.date}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-muted">
              <span>Capacity: <strong className="text-ink">{causeListData.dailyCapacity}</strong></span>
              <span>&bull;</span>
              <span>Scheduled: <strong className="text-accent">{causeListData.count}</strong></span>
            </div>
          </div>

          {/* Table of cases */}
          {causeListData.hearings?.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No cases listed for this date"
                description="No pending cases assigned to this courtroom have their statutory cooling gap elapsed on or before this date."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-muted font-caps text-[11px] border-b border-rule">
                  <tr>
                    <th className="py-2.5 px-3.5 w-12 text-center">Item</th>
                    <th className="py-2.5 px-3.5">Case Number</th>
                    <th className="py-2.5 px-3.5">Title / Parties</th>
                    <th className="py-2.5 px-3.5">Track</th>
                    <th className="py-2.5 px-3.5 text-right">Priority</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {causeListData.hearings.map((h, index) => {
                    const c = h.case;
                    const petitioners =
                      c?.parties
                        ?.filter((p) => p.role === "PETITIONER")
                        .map((p) => p.name)
                        .join(", ") || "N/A";
                    const respondents =
                      c?.parties
                        ?.filter((p) => p.role === "RESPONDENT")
                        .map((p) => p.name)
                        .join(", ") || "N/A";

                    return (
                      <tr key={h.id} className="hover:bg-paper/40 transition-colors duration-100">
                        <td className="py-2.5 px-3.5 text-center font-mono text-muted tabular-nums">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-semibold text-accent tabular-nums">
                          {c?.caseNumber}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-medium text-ink">
                            {c?.title}
                          </div>
                          <div className="text-[11px] text-muted mt-0.5 truncate max-w-md">
                            {petitioners} <span className="text-muted/60">vs</span> {respondents}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <StatusBadge track={c?.track?.name} />
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono tabular-nums">
                          {c?.priorityScore?.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <StatusBadge outcome={h.outcome} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}