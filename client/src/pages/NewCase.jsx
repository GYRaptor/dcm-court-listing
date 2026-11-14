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

    if (complexity >= 7) {
      track = "COMPLEX";
      targetDays = 730;
    } else if (complexity >= 4) {
      track = "STANDARD";
      targetDays = 365;
    }

    return { complexity, track, targetDays };
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
        <div className="bg-surface border border-rule rounded-[4px] p-8 text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-serif text-ink">Case successfully registered</h2>
            <p className="text-xs text-muted">
              Institutional tracking identifier generated and added to judicial master registry.
            </p>
          </div>

          <div className="bg-paper border border-rule rounded-[3px] p-6 max-w-lg mx-auto text-left space-y-3">
            <div className="flex justify-between items-center border-b border-rule pb-2">
              <span className="font-caps text-[11px] text-muted">Case Number</span>
              <span className="font-mono font-bold text-base text-accent tabular-nums">
                {registeredCase.caseNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-rule pb-2">
              <span className="font-caps text-[11px] text-muted">Suggested Track</span>
              <span className="font-sans text-xs font-semibold text-ink">
                {registeredCase.suggestedTrack?.name} <span className="font-mono tabular-nums font-normal text-muted">({registeredCase.suggestedTrack?.targetDays}d target)</span>
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-rule pb-2">
              <span className="font-caps text-[11px] text-muted">Complexity Score</span>
              <span className="font-mono text-xs text-ink font-semibold tabular-nums">
                {registeredCase.complexity} pts
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-rule pb-2">
              <span className="font-caps text-[11px] text-muted">Target Disposal Date</span>
              <span className="font-mono text-xs text-ink tabular-nums">{registeredCase.targetDisposalDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-caps text-[11px] text-muted">Judicial Review</span>
              <span className="font-sans text-xs text-ochre">
                Awaiting judicial review
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              to={`/cases/${registeredCase.id}`}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-surface rounded-[3px] text-xs font-medium transition"
            >
              View case &rarr;
            </Link>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-rule text-ink hover:bg-paper rounded-[3px] text-xs font-medium transition"
            >
              Register another case
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Register case
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Clerk intake form with real-time algorithmic DCFM track classification.
            </p>
          </div>
        </div>
        <div className="rule-double"></div>
      </div>

      {error && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <section
          aria-label="Case particulars"
          className="bg-surface border border-rule rounded-[4px] p-6 space-y-4"
        >
          <h2 className="font-caps text-[11px] text-muted">
            1. Case Particulars
          </h2>

          <div>
            <label className="block font-caps text-[11px] text-muted mb-1">
              Case Title / Cause Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Union of India vs. Global Infotech Ltd."
              className="w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Substantive Case Type *
              </label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              >
                {Object.entries(CASE_TYPE_BASE).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} (Base: {val.points} pts)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Filing Date (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                required
                max={todayStr}
                value={filingDate}
                onChange={(e) => setFilingDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-paper border border-rule rounded-[3px] text-xs font-mono tabular-nums text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink font-sans">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-3.5 w-3.5 text-accent border-rule rounded focus:ring-accent"
              />
              <span>Mark as urgent case (+30 priority points upon scheduling)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink font-sans">
              <input
                type="checkbox"
                checked={hasExpertEvidence}
                onChange={(e) => setHasExpertEvidence(e.target.checked)}
                className="h-3.5 w-3.5 text-accent border-rule rounded focus:ring-accent"
              />
              <span>Involves expert / forensic evidence (+2 complexity points)</span>
            </label>
          </div>
        </section>

        {/* Dynamic Parties Card */}
        <section
          aria-label="Parties and advocates"
          className="bg-surface border border-rule rounded-[4px] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-caps text-[11px] text-muted">
              2. Parties &amp; Advocates (Min. 2)
            </h2>
            <button
              type="button"
              onClick={addPartyRow}
              className="text-xs font-medium text-accent hover:underline"
            >
              + Add party row
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
                  className="flex-1 px-3 py-1.5 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
                />
                <select
                  value={p.role}
                  onChange={(e) => handlePartyChange(idx, "role", e.target.value)}
                  className="w-36 px-2.5 py-1.5 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
                >
                  <option value="PETITIONER">Petitioner</option>
                  <option value="RESPONDENT">Respondent</option>
                  <option value="ADVOCATE">Advocate</option>
                </select>
                <button
                  type="button"
                  disabled={parties.length <= 2}
                  onClick={() => removePartyRow(idx)}
                  className="text-xs px-2 py-1 text-muted hover:text-oxblood disabled:opacity-30 transition font-sans"
                  title="Remove party"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {parties.length > 2 && (
            <p className="text-[11px] text-muted italic">
              Note: More than 2 parties detected &mdash; +1 multi-party complexity point applied.
            </p>
          )}
        </section>

        {/* Real-time Algorithmic Track Suggestion Card */}
        <section
          aria-label="Algorithmic track assessment"
          className="bg-paper border border-rule rounded-[4px] p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-caps text-[11px] text-muted">
                Algorithmic Assessment (System Suggestion)
              </p>
              <div className="flex items-center gap-3 mt-1 text-sm font-sans">
                <span className="font-semibold text-ink font-mono tabular-nums">
                  Complexity: {liveAnalysis.complexity} pts
                </span>
                <span className="text-muted">&bull;</span>
                <span className="font-semibold text-accent font-sans">
                  Suggested Track: {liveAnalysis.track}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Target disposal: <strong className="font-mono tabular-nums text-ink">{liveAnalysis.targetDays} calendar days</strong> (configurable).
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-surface text-xs font-medium rounded-[3px] transition disabled:opacity-50 self-start sm:self-auto"
            >
              {loading ? "Registering..." : "Confirm & register case"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}