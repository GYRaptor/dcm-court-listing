import React from "react";

export default function EmptyState({
  title = "No records found.",
  message = "",
  description = "",
  action = null,
  actionLabel = null,
  onAction = null,
  className = "",
}) {
  const displayMessage = description || message;
  return (
    <div
      className={`p-8 text-left border border-rule rounded-[4px] bg-surface text-ink space-y-2 ${className}`}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {displayMessage && (
        <p className="text-xs text-muted leading-relaxed">{displayMessage}</p>
      )}
      {(action || (actionLabel && onAction)) && (
        <div className="pt-2">
          {action || (
            <button
              onClick={onAction}
              className="text-xs text-accent underline font-medium hover:text-accent-hover"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
