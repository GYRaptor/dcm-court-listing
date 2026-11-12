import React, { useState, useEffect } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

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
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "STANDARD":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "COMPLEX":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadge = (score) => {
    if (score >= 70) return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
    if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Daily Cause List Generator
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Automated listing engine: selects priority-ranked pending cases within judicial capacity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 w-full md:w-auto">
            {/* Judge Selector */}
            <div className="flex-1 sm:flex-initial">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Courtroom / Judge
              </label>
              <select
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Listing Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                onClick={handleFetchList}
                disabled={loading || generating}
                className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition disabled:opacity-50 text-center"
              >
                {loading ? "Checking..." : "View Existing"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || loading}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 text-center"
              >
                {generating ? "Scheduling..." : "⚡ Generate Cause List"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Cause List Docket Display */}
      {causeListData && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header metadata */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Cause List: Courtroom {causeListData.judge?.courtroom}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Presiding: {causeListData.judge?.user?.name} • Listing Date:{" "}
                    <span className="font-mono font-semibold text-slate-800">
                      {causeListData.date}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Daily Capacity
                </span>
                <span className="font-bold text-slate-800">
                  {causeListData.dailyCapacity} cases
                </span>
              </div>
              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Scheduled
                </span>
                <span className="font-bold text-blue-600">
                  {causeListData.count} cases
                </span>
              </div>
            </div>
          </div>

          {/* Table of cases */}
          {causeListData.hearings?.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <span className="text-3xl">⚖️</span>
              <p className="font-semibold text-sm text-slate-700 mt-2">
                No cases listed for this date.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No pending cases assigned to this judge have their cooling gap (earliestNextDate) elapsed on or before this date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
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
                      <tr key={h.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                          {c?.caseNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-xs">
                            {c?.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                            {petitioners} <span className="text-slate-400">vs</span> {respondents}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getTrackBadge(
                              c?.track?.name
                            )}`}
                          >
                            {c?.track?.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getPriorityBadge(
                              c?.priorityScore
                            )}`}
                          >
                            {c?.priorityScore?.toFixed(1)} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                            {h.outcome}
                          </span>
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
