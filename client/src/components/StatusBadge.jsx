import React from "react";

export default function StatusBadge({ type, value, label, className = "" }) {
  const normalized = (value || "").toUpperCase();

  let styles = "bg-slate-50 text-slate-700 ring-slate-600/20";

  if (type === "track") {
    switch (normalized) {
      case "FAST":
        styles = "bg-blue-50 text-blue-700 ring-blue-600/20";
        break;
      case "STANDARD":
        styles = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        break;
      case "COMPLEX":
        styles = "bg-purple-50 text-purple-700 ring-purple-600/20";
        break;
      default:
        styles = "bg-slate-50 text-slate-700 ring-slate-600/20";
    }
  } else if (type === "urgent" || normalized === "URGENT") {
    styles = "bg-rose-50 text-rose-700 ring-rose-600/20";
  } else if (type === "overdue" || normalized === "OVERDUE") {
    styles = "bg-rose-50 text-rose-700 ring-rose-600/20";
  } else if (type === "aging" || normalized === "AGING") {
    styles = "bg-amber-50 text-amber-700 ring-amber-600/20";
  } else if (type === "approval") {
    styles = value
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";
  } else if (type === "outcome") {
    switch (normalized) {
      case "HEARD":
        styles = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        break;
      case "ADJOURNED":
        styles = "bg-amber-50 text-amber-700 ring-amber-600/20";
        break;
      case "DISPOSED":
        styles = "bg-slate-100 text-slate-700 ring-slate-600/10";
        break;
      case "SCHEDULED":
      default:
        styles = "bg-blue-50 text-blue-700 ring-blue-600/20";
    }
  } else if (type === "status") {
    switch (normalized) {
      case "PENDING":
        styles = "bg-blue-50 text-blue-700 ring-blue-600/20";
        break;
      case "LISTED":
        styles = "bg-purple-50 text-purple-700 ring-purple-600/20";
        break;
      case "DISPOSED":
        styles = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        break;
      default:
        styles = "bg-slate-50 text-slate-700 ring-slate-600/20";
    }
  } else if (type === "action") {
    switch (normalized) {
      case "CASE_REGISTERED":
        styles = "bg-blue-50 text-blue-700 ring-blue-600/20";
        break;
      case "TRACK_APPROVED":
        styles = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        break;
      case "TRACK_OVERRIDDEN":
        styles = "bg-purple-50 text-purple-700 ring-purple-600/20";
        break;
      case "CAUSE_LIST_GENERATED":
        styles = "bg-amber-50 text-amber-700 ring-amber-600/20";
        break;
      case "OUTCOME_RECORDED":
        styles = "bg-slate-50 text-slate-700 ring-slate-600/20";
        break;
      default:
        styles = "bg-slate-50 text-slate-700 ring-slate-600/20";
    }
  }

  const displayText = label || value;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles} ${className}`}
    >
      {displayText}
    </span>
  );
}

