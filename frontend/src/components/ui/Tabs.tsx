import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  badge?: number;
  testId?: string;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Underline Tabs primitive (Doc 01 §7 Tabs):
 * 44 px height, 2 px Lantern underline on active tab, keyboard arrow navigation.
 */
export function Tabs({
  value,
  onValueChange,
  items,
  children,
  ariaLabel,
}: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        aria-label={ariaLabel}
        className="flex items-center gap-2 border-b border-border"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            data-testid={item.testId}
            className="relative inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-text-2 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[state=active]:text-text data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-accent"
          >
            <span>{item.label}</span>
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 font-mono text-[11px] font-bold text-on-accent">
                {item.badge}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
