import React from "react";

export default function StatusBadge({
  type,
  value,
  label,
  track,
  status,
  urgency,
  outcome,
  className = "",
}) {
  const resolvedValue = (track || status || urgency || outcome || value || "").toUpperCase();
  const isTrack = Boolean(track) || type === "track" || ["FAST", "STANDARD", "COMPLEX"].includes(resolvedValue);
  const isUrgent = Boolean(urgency) || type === "urgent" || resolvedValue === "URGENT";
  const isOutcome = Boolean(outcome) || type === "outcome" || ["SCHEDULED", "HEARD", "ADJOURNED", "DISPOSED"].includes(resolvedValue);

  // Tracks: Small outlined labels in small caps with letter-spacing, using navy tints
  if (isTrack) {
    if (resolvedValue === "FAST") {
      return (
        <span
          className={`inline-flex items-center border border-[#6B88AB]/50 text-[#3E6088] font-caps px-1.5 py-0.5 rounded-[2px] bg-transparent ${className}`}
        >
          {label || "FAST"}
        </span>
      );
    }
    if (resolvedValue === "STANDARD") {
      return (
        <span
          className={`inline-flex items-center border border-[#3E6088]/60 text-[#1F3A5F] font-caps px-1.5 py-0.5 rounded-[2px] bg-transparent ${className}`}
        >
          {label || "STANDARD"}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center border border-[#1F3A5F] text-[#1F3A5F] font-caps px-1.5 py-0.5 rounded-[2px] bg-transparent font-bold ${className}`}
      >
        {label || "COMPLEX"}
      </span>
    );
  }

  // Urgency: Small text flag in oxblood
  if (isUrgent) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold text-oxblood ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-oxblood shrink-0"></span>
        <span>{label || "Urgent"}</span>
      </span>
    );
  }

  // Hearing outcomes: plain text with subtle dot indicator
  if (isOutcome) {
    const outcomeText = label || resolvedValue;
    let dotClass = "bg-muted";
    let textClass = "text-muted";
    if (resolvedValue === "SCHEDULED") {
      dotClass = "bg-accent";
      textClass = "text-accent font-medium";
    } else if (resolvedValue === "HEARD") {
      dotClass = "bg-[#3E6088]";
      textClass = "text-ink";
    } else if (resolvedValue === "ADJOURNED") {
      dotClass = "bg-ochre";
      textClass = "text-ochre";
    } else if (resolvedValue === "DISPOSED") {
      dotClass = "bg-rule";
      textClass = "text-muted";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${textClass} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0`}></span>
        <span className="font-sans text-xs tracking-wide">{outcomeText}</span>
      </span>
    );
  }

  // Case Status: Plain text with small colored dot (not a pill)
  if (status || type === "status") {
    let dotColor = "bg-muted";
    let textColor = "text-muted";

    if (resolvedValue === "LISTED") {
      dotColor = "bg-accent";
      textColor = "text-accent font-medium";
    } else if (resolvedValue === "DISPOSED") {
      dotColor = "bg-rule";
      textColor = "text-muted";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${textColor} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}></span>
        <span className="font-sans">{label || resolvedValue}</span>
      </span>
    );
  }

  // Audit actions: Quiet plain monospace text
  return (
    <span className={`font-mono text-[11px] text-muted ${className}`}>
      {label || resolvedValue}
    </span>
  );
}
