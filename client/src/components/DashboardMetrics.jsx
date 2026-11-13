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
      <div className="border-y border-rule py-5 grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-rule bg-surface/40">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-5 px-6 space-y-2 animate-pulse">
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
    <div className="border-y border-rule grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-rule bg-surface/30">
      {/* 1. Pending Cases */}
      <Link
        to="/cases?status=PENDING"
        className="group py-5 px-6 transition-colors duration-150 hover:bg-paper/70 flex flex-col justify-between"
        title="View pending registry cases"
      >
        <div>
          <span className="font-caps text-[11px] text-muted block mb-1.5 group-hover:text-ink transition-colors">
            Pending cases
          </span>
          <div className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
            {stats?.totalPending ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2 leading-snug">
          Active matters awaiting hearing &rarr;
        </p>
      </Link>

      {/* 2. Past Target Date (Oxblood) */}
      <a
        href="#attention"
        className="group py-5 px-6 transition-colors duration-150 hover:bg-oxblood-light/50 flex flex-col justify-between"
        title="Jump to attention required matters"
      >
        <div>
          <span className="font-caps text-[11px] text-oxblood block mb-1.5 font-semibold">
            Overdue cases
          </span>
          <div className="font-serif text-3xl font-bold tracking-tight text-oxblood tabular-nums">
            {stats?.overdueCases ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2 leading-snug">
          Exceeded configured targets &rarr;
        </p>
      </a>

      {/* 3. Hearings Today */}
      <a
        href="#todays-hearings"
        className="group py-5 px-6 transition-colors duration-150 hover:bg-paper/70 flex flex-col justify-between"
        title="View today's court session hearings"
      >
        <div>
          <span className="font-caps text-[11px] text-accent block mb-1.5">
            Hearings today
          </span>
          <div className="font-serif text-3xl font-bold tracking-tight text-accent tabular-nums">
            {stats?.hearingsToday ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2 leading-snug">
          Scheduled bench matters &rarr;
        </p>
      </a>

      {/* 4. Upcoming Deadlines */}
      <a
        href="#attention"
        className="group py-5 px-6 transition-colors duration-150 hover:bg-paper/70 flex flex-col justify-between"
        title="View matters with target deadlines within 7 days"
      >
        <div>
          <span className="font-caps text-[11px] text-ochre block mb-1.5">
            Upcoming deadlines
          </span>
          <div className="font-serif text-3xl font-bold tracking-tight text-ochre tabular-nums">
            {stats?.upcomingDeadlines ?? 0}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2 leading-snug">
          Due within next 7 days &rarr;
        </p>
      </a>

      {/* 5. Average Case Age */}
      <a
        href="#analytics"
        className="group py-5 px-6 transition-colors duration-150 hover:bg-paper/70 flex flex-col justify-between"
        title="Inspect analytical track age breakdown"
      >
        <div>
          <span className="font-caps text-[11px] text-muted block mb-1.5 group-hover:text-ink transition-colors">
            Average age
          </span>
          <div className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
            {stats?.averageAge ?? 0}
            <span className="text-sm font-sans font-normal text-muted ml-1.5">days</span>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2 leading-snug">
          Mean calendar days elapsed &rarr;
        </p>
      </a>
    </div>
  );
}