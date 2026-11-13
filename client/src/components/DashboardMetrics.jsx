import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

export default function DashboardMetrics({ initialStats = null }) {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);
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
    if (initialStats) {
      setStats(initialStats);
      setLoading(false);
    } else {
      fetchStats();
    }
  }, [initialStats]);

  if (loading) {
    return (
      <div className="border-y border-rule py-4 grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-rule">
        {[1, 2, 3, 4, 5].map((i) => (
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
    <div className="border-y border-rule py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-rule">
      {/* 1. Pending Cases */}
      <Link
        to="/cases?status=PENDING"
        className="group p-3 transition-colors duration-150 hover:bg-paper/60 flex flex-col justify-between"
        title="View pending registry cases"
      >
        <div>
          <span className="font-caps text-[11px] text-muted block mb-1 group-hover:text-ink transition-colors">
            Pending cases
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink tabular-nums">
            {stats?.totalPending ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Active cases awaiting hearing or listing &rarr;
        </p>
      </Link>

      {/* 2. Past Target Date (Oxblood) */}
      <a
        href="#attention"
        className="group p-3 transition-colors duration-150 hover:bg-oxblood-light/40 flex flex-col justify-between"
        title="Jump to attention required matters"
      >
        <div>
          <span className="font-caps text-[11px] text-oxblood block mb-1">
            Overdue cases
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-oxblood tabular-nums">
            {stats?.overdueCases ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Exceeded configured track targets &rarr;
        </p>
      </a>

      {/* 3. Hearings Today */}
      <a
        href="#todays-hearings"
        className="group p-3 transition-colors duration-150 hover:bg-paper/60 flex flex-col justify-between"
        title="View today's court session hearings"
      >
        <div>
          <span className="font-caps text-[11px] text-accent block mb-1">
            Hearings today
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-accent tabular-nums">
            {stats?.hearingsToday ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Scheduled &amp; recorded bench matters &rarr;
        </p>
      </a>

      {/* 4. Upcoming Deadlines */}
      <a
        href="#attention"
        className="group p-3 transition-colors duration-150 hover:bg-paper/60 flex flex-col justify-between"
        title="View matters with target deadlines within 7 days"
      >
        <div>
          <span className="font-caps text-[11px] text-ochre block mb-1">
            Upcoming deadlines
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ochre tabular-nums">
            {stats?.upcomingDeadlines ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Matters due within the next 7 days &rarr;
        </p>
      </a>

      {/* 5. Average Case Age */}
      <a
        href="#analytics"
        className="group p-3 transition-colors duration-150 hover:bg-paper/60 flex flex-col justify-between"
        title="Inspect analytical track age breakdown"
      >
        <div>
          <span className="font-caps text-[11px] text-muted block mb-1 group-hover:text-ink transition-colors">
            Average age
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink tabular-nums">
            {stats?.averageAge ?? 0}
            <span className="text-sm font-sans font-normal text-muted ml-1">days</span>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-snug">
          Mean days elapsed since filing &rarr;
        </p>
      </a>
    </div>
  );
}