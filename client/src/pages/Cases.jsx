import React from "react";

export default function Cases() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-2">📁 Case Registry</h1>
        <p className="text-sm text-slate-500 mb-4">
          Master table of pending, listed, and disposed cases with track assignments. (Implemented on Day 3).
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          🔒 Restricted to <strong>CLERK</strong> role.
        </div>
      </div>
    </div>
  );
}

