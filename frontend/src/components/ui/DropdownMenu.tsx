import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export const DropdownRoot = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;
export const DropdownSeparator = () => (
  <RadixDropdown.Separator className="my-1 h-px bg-border" />
);

export function DropdownContent({
  children,
  align = "end",
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={8}
        className="z-dropdown min-w-[200px] rounded-lg border border-border bg-surface p-1.5 text-text shadow-modal animate-pop-in focus:outline-none"
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  danger,
  asChild,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  asChild?: boolean;
}) {
  return (
    <RadixDropdown.Item
      asChild={asChild}
      onSelect={onSelect}
      className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm outline-none transition-colors ${
        danger
          ? "text-risk-high data-[highlighted]:bg-risk-high-tint"
          : "text-text data-[highlighted]:bg-surface-2"
      }`}
    >
      {children}
    </RadixDropdown.Item>
  );
}
