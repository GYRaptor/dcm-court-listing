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
        setSuccessMsg("Retrieved previously generated cause list (idempotent result).");
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

  const getPriorityBadge = (score) => {
    if (score >= 70) return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 font-bold";
    if (score >= 40) return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 font-semibold";
    return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Daily Cause List Generator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated listing engine: selects priority-ranked pending cases within courtroom capacity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 w-full md:w-auto">
            {/* Judge Selector */}
            <div className="flex-1 sm:flex-initial">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Courtroom / Judge
              </label>
              <select
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
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
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Listing Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono tabular-nums transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                onClick={handleFetchList}
                disabled={loading || generating}
                className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-medium rounded-lg transition disabled:opacity-50 text-center shadow-sm"
              >
                {loading ? "Checking..." : "View Existing"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || loading}
                className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 text-center"
              >
                {generating ? "Scheduling..." : "⚡ Generate Cause List"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Cause List Docket Display */}
      {causeListData && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          {/* Header metadata */}
          <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">
                    Cause List: Courtroom {causeListData.judge?.courtroom}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Presiding: {causeListData.judge?.user?.name} • Listing Date:{" "}
                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                      {causeListData.date}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div className="px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                  Daily Capacity
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {causeListData.dailyCapacity} cases
                </span>
              </div>
              <div className="px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                  Scheduled
                </span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {causeListData.count} cases
                </span>
              </div>
            </div>
          </div>

          {/* Table of cases */}
          {causeListData.hearings?.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="⚖️"
                title="No cases listed for this date"
                description="No pending cases assigned to this courtroom have their statutory cooling gap elapsed on or before this date."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Item</th>
                    <th className="py-3 px-4">Case Number</th>
                    <th className="py-3 px-4">Title / Parties</th>
                    <th className="py-3 px-4">Track</th>
                    <th className="py-3 px-4">Priority Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs tabular-nums">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs tabular-nums">
                          {c?.caseNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 text-xs">
                            {c?.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                            {petitioners} <span className="text-slate-400">vs</span> {respondents}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge track={c?.track?.name} />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono tabular-nums ${getPriorityBadge(
                              c?.priorityScore
                            )}`}
                          >
                            ⚡ {c?.priorityScore?.toFixed(1)} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
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
