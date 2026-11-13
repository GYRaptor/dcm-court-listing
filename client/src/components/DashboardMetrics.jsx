import React, { useState, useEffect } from "react";
import api from "../api.js";

export default function DashboardMetrics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/dashboard/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="border-y border-rule py-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-2 space-y-2 animate-pulse">
            <div className="h-3 bg-rule/50 rounded w-1/3"></div>
            <div className="h-8 bg-rule/70 rounded w-1/4"></div>
            <div className="h-3 bg-rule/40 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-oxblood/30 bg-oxblood-light/40 p-4 rounded-[4px] text-xs text-oxblood flex items-center justify-between">
        <span>Unable to load metrics: {error}</span>
        <button
          onClick={fetchStats}
          className="text-xs text-accent underline font-medium hover:text-accent-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="border-y border-rule py-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule">
      {/* Pending Cases */}
      <div className="py-2 sm:py-0 sm:px-6 first:pl-0">
        <span className="font-caps text-muted block mb-1">
          Pending cases
        </span>
        <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink tabular-nums">
          {stats?.totalPending ?? 0}
        </div>
        <p className="text-xs text-muted mt-1">
          Active cases awaiting trial or hearing listing
        </p>
      </div>

      {/* Cases Past Target Date (Oxblood) */}
      <div className="py-3 sm:py-0 sm:px-6">
        <span className="font-caps text-oxblood block mb-1">
          Past target date
        </span>
        <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-oxblood tabular-nums">
          {stats?.overdueCases ?? 0}
        </div>
        <p className="text-xs text-muted mt-1">
          Cases exceeding configured track target days
        </p>
      </div>

      {/* Average Case Age */}
      <div className="py-2 sm:py-0 sm:px-6 last:pr-0">
        <span className="font-caps text-muted block mb-1">
          Average age (days)
        </span>
        <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink tabular-nums">
          {stats?.averageAge ?? 0}
        </div>
        <p className="text-xs text-muted mt-1">
          Mean calendar days elapsed since initial filing
        </p>
      </div>
    </div>
  );
}
