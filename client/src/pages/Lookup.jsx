import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Lookup() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-2">🔎 Public Case Lookup</h1>
        <p className="text-sm text-slate-500 mb-4">
          Search court matters by CNR / case number to track assigned DCFM track, next hearing date, and proceedings history. (Implemented on Day 4).
        </p>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          🔓 Accessible to all authenticated users (Primary interface for <strong>LAWYER</strong> role).
        </div>
      </div>
    </div>
  );
}

