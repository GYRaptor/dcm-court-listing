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

  const renderDetails = (details) => {
    if (!details) return <span className="text-muted italic">None</span>;
    if (typeof details === "string") return <span>{details}</span>;

    return (
      <div className="space-y-0.5 text-[11px] font-mono text-muted">
        {details.caseNumber && (
          <div>
            Matter: <span className="font-semibold text-ink tabular-nums">{details.caseNumber}</span>
          </div>
        )}
        {details.reason && (
          <div className="text-ink font-sans italic">Reason: &ldquo;{details.reason}&rdquo;</div>
        )}
        {details.outcome && (
          <div>
            Outcome: <span className="font-semibold text-ink">{details.outcome}</span>
          </div>
        )}
        {details.nextEligibleDate && (
          <div>
            Next Date: <span className="text-accent font-semibold tabular-nums">{details.nextEligibleDate}</span>
          </div>
        )}
        {details.courtroom && (
          <div>
            Courtroom: <span className="font-semibold text-ink">{details.courtroom}</span> ({details.casesListed} listed)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
              Audit log
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Chronological ledger of case intake, track modifications, listings, and hearing outcomes.
            </p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="font-caps text-[11px] text-muted whitespace-nowrap">
              Filter event:
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-sans border border-rule rounded-[3px] bg-paper text-ink focus:outline-none focus:border-accent"
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
        <div className="rule-double"></div>
      </div>

      {error && (
        <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood rounded-[4px] text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-surface border border-rule rounded-[4px] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted font-mono text-xs space-y-2 animate-pulse">
            <div>Loading audit log records...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No audit events found"
              description="Events will appear here as administrative and judicial actions occur."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper text-muted font-caps text-[11px] border-b border-rule">
                <tr>
                  <th className="py-3.5 px-4 w-44">Timestamp</th>
                  <th className="py-3.5 px-4 w-44">Action</th>
                  <th className="py-3.5 px-4 w-40">Initiator</th>
                  <th className="py-3.5 px-4 w-44">Target Case</th>
                  <th className="py-3.5 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-ink">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper/40 transition-colors duration-100">
                    <td className="py-3.5 px-4 font-mono text-muted whitespace-nowrap tabular-nums">
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
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ink">
                        {log.user?.name || "System"}
                      </div>
                      <div className="text-[10px] text-muted font-caps">
                        {log.user?.role}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.case ? (
                        <Link
                          to={`/cases/${log.case.id}`}
                          className="font-mono font-semibold text-accent hover:underline tabular-nums"
                        >
                          {log.case.caseNumber}
                        </Link>
                      ) : (
                        <span className="text-muted text-xs font-sans">General / Bench</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
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