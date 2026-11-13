import React from "react";

export function SkeletonCard({ count = 3, className = "" }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 border border-rule rounded-[4px] bg-surface animate-pulse space-y-2"
        >
          <div className="h-3 bg-rule/50 rounded w-1/3"></div>
          <div className="h-7 bg-rule/70 rounded w-1/4"></div>
          <div className="h-3 bg-rule/40 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6, className = "" }) {
  return (
    <div className={`border border-rule rounded-[4px] bg-surface overflow-hidden ${className}`}>
      <div className="p-3 border-b border-rule bg-paper/60 flex gap-4 animate-pulse">
        <div className="h-3 bg-rule/70 rounded w-1/4"></div>
      </div>
      <div className="divide-y divide-rule p-3 space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center animate-pulse py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3 bg-rule/40 rounded"
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
