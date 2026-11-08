import { flushSync } from "react-dom";

type DocWithVT = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { skipTransition?: () => void };
};

/**
 * Runs a page-wide visual change (language, theme) inside a View Transition so
 * the old and new page crossfade, and any element with a view-transition-name
 * (the active pill of a switch) slides to its new place.
 *
 * The update runs inside flushSync so React commits the re-render before the
 * browser takes the "after" snapshot. Without View Transitions support, or with
 * reduced motion, the change simply happens at once.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as DocWithVT;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }

  // The browser runs the update only after it paints the "before" snapshot. A
  // page that is not painting (background or hidden embed) would never get
  // there, so after 300 ms the change is applied directly and the animation
  // dropped: a language or theme switch must never be lost.
  let ran = false;
  const run = () => {
    if (ran) return false;
    ran = true;
    flushSync(update);
    return true;
  };

  const transition = doc.startViewTransition(async () => {
    if (!run()) return;
    // Let any follow-up commit (i18n listeners, effects) land before the snapshot.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

  setTimeout(() => {
    if (ran) return;
    transition.skipTransition?.();
    run();
  }, 300);
}

/** A valid view-transition-name from any string (React ids contain colons). */
export function vtName(...parts: string[]): string {
  return parts.join("-").replace(/[^a-zA-Z0-9_-]/g, "");
}
