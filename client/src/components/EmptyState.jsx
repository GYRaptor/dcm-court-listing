import React from "react";

export default function EmptyState({
  icon = "📂",
  title = "No records found",
  message = "No court matters match the current filter or search criteria.",
  className = "",
  action = null,
}) {
  return (
    <div
      className={`p-10 text-center text-slate-500 border border-dashed border-slate-200/90 rounded-xl bg-slate-50/30 space-y-2 ${className}`}
    >
      <span className="text-3xl block">{icon}</span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {message && <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{message}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

