import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  closeLabel?: string;
  testId?: string;
}

/**
 * Accessible dialog primitive (Doc 01 §7 Modal):
 * Max 520 px, focus-trapped, Escape dismiss, bottom-sheet on narrow viewports.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = "Close",
  testId,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-raat/75 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content
          data-testid={testId}
          className="fixed inset-x-0 bottom-0 z-modal mx-auto w-full max-w-[520px] rounded-t-2xl border border-border-strong bg-surface p-6 text-text shadow-modal focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-text">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-text-2">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Icon icon="ph:x" className="text-lg" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
