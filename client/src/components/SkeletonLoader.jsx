import React from "react";

export function SkeletonCard({ count = 3, className = "" }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-pulse space-y-3"
        >
          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
          <div className="h-7 bg-slate-200/70 rounded w-1/4"></div>
          <div className="h-3 bg-slate-100 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 animate-pulse">
        <div className="h-4 bg-slate-200/70 rounded w-1/4"></div>
      </div>
      <div className="divide-y divide-slate-100 p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center animate-pulse py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-slate-100 rounded"
                style={{ width: `${Math.max(40, (100 / cols) * (c === 0 ? 0.7 : 1))}%` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SkeletonLoader({ type = "card", ...props }) {
  if (type === "table") {
    return <SkeletonTable {...props} />;
  }
  return <SkeletonCard {...props} />;
}

