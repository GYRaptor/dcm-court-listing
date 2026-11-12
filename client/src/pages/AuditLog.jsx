import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

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
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "TRACK_APPROVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "TRACK_OVERRIDDEN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CAUSE_LIST_GENERATED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "OUTCOME_RECORDED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const renderDetails = (details) => {
    if (!details) return <span className="text-slate-400 italic">None</span>;
    if (typeof details === "string") return <span>{details}</span>;

    return (
      <div className="space-y-0.5 text-[11px] font-mono text-slate-600">
        {details.caseNumber && (
          <div>Case: <span className="font-semibold text-slate-800">{details.caseNumber}</span></div>
        )}
        {details.reason && (
          <div className="text-purple-700 font-sans italic">Reason: "{details.reason}"</div>
        )}
        {details.outcome && (
          <div>Outcome: <span className="font-bold text-slate-800">{details.outcome}</span></div>
        )}
        {details.nextEligibleDate && (
          <div>Next Date: <span className="text-blue-600 font-semibold">{details.nextEligibleDate}</span></div>
        )}
        {details.courtroom && (
          <div>Courtroom: <span className="font-semibold">{details.courtroom}</span> ({details.casesListed} listed)</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <h1 className="text-xl font-bold text-slate-900">
                Judicial Event Audit Log
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Immutable chronological record of case intake, track modifications, listing events, and hearing outcomes.
            </p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter Event:
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
            <p className="text-xs">Loading immutable audit entries...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <span className="text-3xl">📜</span>
            <p className="text-sm font-semibold text-slate-700">No audit events match your filter.</p>
            <p className="text-xs text-slate-400">Events will appear here as administrative and judicial actions occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
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
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
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
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-slate-800">
                        {log.user?.name || "System"}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        {log.user?.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.case ? (
                        <Link
                          to={`/cases/${log.case.id}`}
                          className="font-mono font-semibold text-blue-600 hover:underline"
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
