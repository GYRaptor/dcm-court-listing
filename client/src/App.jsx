import React, { useState, useEffect } from "react";

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test backend /health endpoint
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    fetch(`${backendUrl}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-2.5 bg-blue-100 text-blue-800 rounded-lg text-2xl font-bold">
            ⚖️
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              DCM Court Listing System
            </h1>
            <p className="text-sm text-slate-500">
              Ministry of Law and Justice Problem Statement 147
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Day 1 System Status
          </h2>
          {loading && (
            <p className="text-sm text-slate-500 animate-pulse">
              Checking backend connectivity...
            </p>
          )}
          {error && (
            <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm">
              <p className="font-semibold">Backend offline or initializing</p>
              <p className="text-xs text-amber-700 mt-1">
                Make sure the Express server is running on port 5000. Error: {error}
              </p>
            </div>
          )}
          {health && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">
              <p className="font-semibold flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Backend API Connected: {health.message}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Timestamp: {health.timestamp}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            DCM Tracks Configured
          </h3>
          <ul className="text-sm space-y-2 text-slate-700">
            <li className="flex justify-between items-center">
              <span>🚀 <strong>FAST Track</strong> (Bail, Cheque Bounce)</span>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">90 days target</span>
            </li>
            <li className="flex justify-between items-center">
              <span>⚖️ <strong>STANDARD Track</strong> (Civil Suits, Rent)</span>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">365 days target</span>
            </li>
            <li className="flex justify-between items-center">
              <span>🏢 <strong>COMPLEX Track</strong> (Commercial & Property)</span>
              <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">730 days target</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
