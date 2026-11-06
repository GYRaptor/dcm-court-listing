import React from "react";

export default function CauseList() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-2">📜 Daily Cause List Generator</h1>
        <p className="text-sm text-slate-500 mb-4">
          Automated capacity-constrained daily listing generator based on priority scoring. (Implemented on Day 5).
        </p>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
          🔒 Accessible by <strong>CLERK</strong> and <strong>JUDGE</strong> roles.
        </div>
      </div>
    </div>
  );
}

