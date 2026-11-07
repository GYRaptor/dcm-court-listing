import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

const CASE_TYPE_BASE = {
  BAIL: { points: 1, label: "Bail Application" },
  CHEQUE_BOUNCE: { points: 2, label: "Cheque Bounce (S. 138 NI Act)" },
  RENT_DISPUTE: { points: 3, label: "Rent & Eviction Dispute" },
  CIVIL_SUIT: { points: 5, label: "Civil Suit for Damages/Injunction" },
  COMMERCIAL_DISPUTE: { points: 6, label: "Commercial Contract Dispute" },
  PROPERTY_DISPUTE: { points: 7, label: "Real Estate Title & Partition Suit" },
};

export default function NewCase() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("BAIL");
  const [filingDate, setFilingDate] = useState(todayStr);
  const [isUrgent, setIsUrgent] = useState(false);
  const [hasExpertEvidence, setHasExpertEvidence] = useState(false);

  const [parties, setParties] = useState([
    { name: "", role: "PETITIONER" },
    { name: "", role: "RESPONDENT" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredCase, setRegisteredCase] = useState(null);

  // Dynamic live calculation of complexity and track recommendation
  const liveAnalysis = useMemo(() => {
    const base = CASE_TYPE_BASE[caseType]?.points || 1;
    const partyPenalty = parties.length > 2 ? 1 : 0;
    const evidencePenalty = hasExpertEvidence ? 2 : 0;
    const complexity = base + partyPenalty + evidencePenalty;

    let track = "FAST";
    let targetDays = 90;
    let badgeClass = "bg-blue-100 text-blue-800 border-blue-300";

    if (complexity >= 7) {
      track = "COMPLEX";
      targetDays = 730;
      badgeClass = "bg-purple-100 text-purple-800 border-purple-300";
    } else if (complexity >= 4) {
      track = "STANDARD";
      targetDays = 365;
      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    }

    return { complexity, track, targetDays, badgeClass };
  }, [caseType, parties.length, hasExpertEvidence]);

  const handlePartyChange = (index, field, value) => {
    const updated = [...parties];
    updated[index][field] = value;
    setParties(updated);
  };

  const addPartyRow = () => {
    setParties([...parties, { name: "", role: "ADVOCATE" }]);
  };

  const removePartyRow = (index) => {
    if (parties.length <= 2) return;
    setParties(parties.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate party names
    for (const p of parties) {
      if (!p.name.trim()) {
        setError("All party names must be filled in.");
        return;
      }
    }

    const hasPetitioner = parties.some((p) => p.role === "PETITIONER");
    const hasRespondent = parties.some((p) => p.role === "RESPONDENT");

    if (!hasPetitioner || !hasRespondent) {
      setError("A case must include at least one Petitioner and one Respondent.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title,
        caseType,
        filingDate,
        isUrgent,
        hasExpertEvidence,
        parties,
      };

      const res = await api.post("/cases", payload);
      setRegisteredCase(res.case);
    } catch (err) {
      setError(err.message || "Failed to register case");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCaseType("BAIL");
    setFilingDate(todayStr);
    setIsUrgent(false);
    setHasExpertEvidence(false);
    setParties([
      { name: "", role: "PETITIONER" },
      { name: "", role: "RESPONDENT" },
    ]);
    setRegisteredCase(null);
    setError("");
  };

  // If case registration is complete, show the success confirmation card
  if (registeredCase) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-emerald-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Case Successfully Registered</h2>
          <p className="text-sm text-slate-500 mb-6">
            Institutional tracking number and DCFM complexity profile generated.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-lg mx-auto text-left space-y-3 mb-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs uppercase font-semibold text-slate-500">Case Number</span>
              <span className="font-mono font-bold text-lg text-blue-700">
                {registeredCase.caseNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs uppercase font-semibold text-slate-500">Suggested Track</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-md font-bold border ${
                  registeredCase.suggestedTrack?.name === "COMPLEX"
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : registeredCase.suggestedTrack?.name === "STANDARD"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
                }`}
              >
                {registeredCase.suggestedTrack?.name} ({registeredCase.suggestedTrack?.targetDays} Days Target)
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs uppercase font-semibold text-slate-500">Complexity Score</span>
              <span className="font-semibold text-slate-800">{registeredCase.complexity} Points</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs uppercase font-semibold text-slate-500">Target Disposal Date</span>
              <span className="font-mono text-sm text-slate-800">{registeredCase.targetDisposalDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase font-semibold text-slate-500">Judicial Review</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Pending Judge Approval
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              to={`/cases/${registeredCase.id}`}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
            >
              View Case Dossier →
            </Link>
            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
            >
              Register Another Matter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Register New Court Matter</h1>
        <p className="text-sm text-slate-500">
          Clerk intake form with real-time algorithmic DCFM track suggestion.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Registration Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            1. Matter Particulars
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Case Title / Cause Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Union of India vs. Global Infotech Ltd."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Substantive Case Type *
              </label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                {Object.entries(CASE_TYPE_BASE).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} (Base: {val.points} pts)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Filing Date (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                required
                max={todayStr}
                value={filingDate}
                onChange={(e) => setFilingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                🚨 Mark as Urgent Matter (+30 priority points upon scheduling)
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpertEvidence}
                onChange={(e) => setHasExpertEvidence(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                🔬 Involves Expert / Forensic Evidence (+2 complexity points)
              </span>
            </label>
          </div>
        </div>

        {/* Dynamic Parties Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              2. Parties & Advocates (Min. 2)
            </h2>
            <button
              type="button"
              onClick={addPartyRow}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
            >
              + Add Party Row
            </button>
          </div>

          <div className="space-y-3">
            {parties.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder={`Party ${idx + 1} Name`}
                  value={p.name}
                  onChange={(e) => handlePartyChange(idx, "name", e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={p.role}
                  onChange={(e) => handlePartyChange(idx, "role", e.target.value)}
                  className="w-36 px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm bg-white focus:outline-none"
                >
                  <option value="PETITIONER">Petitioner</option>
                  <option value="RESPONDENT">Respondent</option>
                  <option value="ADVOCATE">Advocate</option>
                </select>
                <button
                  type="button"
                  disabled={parties.length <= 2}
                  onClick={() => removePartyRow(idx)}
                  className="text-xs px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Remove party"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {parties.length > 2 && (
            <p className="text-[11px] text-blue-600 italic">
              ℹ️ More than 2 parties detected: +1 party complexity penalty applied.
            </p>
          )}
        </div>

        {/* Real-time Algorithmic Track Suggestion Card */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Algorithmic Assessment (System Suggestion Only)
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-bold">Complexity Score: {liveAnalysis.complexity}</span>
                <span className={`text-xs px-2.5 py-1 rounded-md font-bold border ${liveAnalysis.badgeClass}`}>
                  Suggested Track: {liveAnalysis.track}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target Disposal: <strong>{liveAnalysis.targetDays} calendar days</strong> (Upper limit: 730 days).
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md hover:shadow transition disabled:opacity-50"
            >
              {loading ? "Registering Case..." : "Confirm & Register Case →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
