import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const query = actionFilter !== "ALL" ? `?action=${actionFilter}` : "";
      const res = await api.get(`/audit-log${query}`);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action) => {
    switch (action) {
      case "CASE_REGISTERED":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "TRACK_APPROVED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
      case "TRACK_OVERRIDDEN":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      case "CAUSE_LIST_GENERATED":
        return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
      case "OUTCOME_RECORDED":
        return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";
    }
  };

  const renderDetails = (details) => {
    if (!details) return <span className="text-slate-400 italic">None</span>;
    if (typeof details === "string") return <span>{details}</span>;

    return (
      <div className="space-y-0.5 text-[11px] font-mono text-slate-600">
        {details.caseNumber && (
          <div>Matter: <span className="font-semibold text-slate-800 tabular-nums">{details.caseNumber}</span></div>
        )}
        {details.reason && (
          <div className="text-purple-700 font-sans italic">Reason: "{details.reason}"</div>
        )}
        {details.outcome && (
          <div>Outcome: <span className="font-semibold text-slate-800">{details.outcome}</span></div>
        )}
        {details.nextEligibleDate && (
          <div>Next Date: <span className="text-blue-600 font-semibold tabular-nums">{details.nextEligibleDate}</span></div>
        )}
        {details.courtroom && (
          <div>Courtroom: <span className="font-semibold text-slate-800">{details.courtroom}</span> ({details.casesListed} listed)</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Judicial Event Audit Log
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Immutable chronological record of case intake, track modifications, listing events, and hearing outcomes.
            </p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Filter Event:
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium transition"
            >
              <option value="ALL">All Actions ({total})</option>
              <option value="CASE_REGISTERED">CASE_REGISTERED</option>
              <option value="TRACK_APPROVED">TRACK_APPROVED</option>
              <option value="TRACK_OVERRIDDEN">TRACK_OVERRIDDEN</option>
              <option value="CAUSE_LIST_GENERATED">CAUSE_LIST_GENERATED</option>
              <option value="OUTCOME_RECORDED">OUTCOME_RECORDED</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50/70 border border-rose-200/80 text-rose-800 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-200/70 rounded w-1/4 mx-auto"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto"></div>
            <p className="text-xs">Loading immutable audit entries...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="📜"
              title="No audit events match your filter"
              description="Events will appear here as administrative and judicial actions occur."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 w-44">Timestamp</th>
                  <th className="py-3 px-4 w-44">Action</th>
                  <th className="py-3 px-4 w-40">Initiator</th>
                  <th className="py-3 px-4 w-44">Target Matter</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-slate-800">
                        {log.user?.name || "System"}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                        {log.user?.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.case ? (
                        <Link
                          to={`/cases/${log.case.id}`}
                          className="font-mono font-semibold text-blue-600 hover:text-blue-700 hover:underline tabular-nums"
                        >
                          {log.case.caseNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">General / Bench</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {renderDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
