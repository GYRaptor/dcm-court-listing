import React from "react";

export default function AuditLog() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-2">🔍 Judicial Audit Log</h1>
        <p className="text-sm text-slate-500 mb-4">
          Immutable event log of case registrations, track approvals, listing generations, and hearing outcomes. (Implemented on Day 7).
        </p>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
          🔒 Restricted to <strong>JUDGE</strong> role.
        </div>
      </div>
    </div>
  );
}

