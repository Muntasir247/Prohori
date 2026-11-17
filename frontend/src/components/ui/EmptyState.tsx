import type { ReactNode } from "react";

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}

/**
 * Reusable empty state component (Doc 01 §7 EmptyState):
 * Small illustration or 32 px icon, one line, one optional action.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center"
    >
      {illustration && <div className="mb-1">{illustration}</div>}
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-text-2">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
