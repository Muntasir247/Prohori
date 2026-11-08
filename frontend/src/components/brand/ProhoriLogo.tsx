import { useTranslation } from "react-i18next";

// "The Eighth Watch" (Doc 01 §2): a ring of eight arcs, one lit in Lantern at
// the 1–2 o'clock position, with a centre dot. No shield, no gradient, no glow.
interface ProhoriLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  /** Kept for API compatibility; the status pill was removed. */
  showStatus?: boolean;
  variant?: "full" | "icon" | "minimal";
  className?: string;
}

const SIZES = {
  sm: { icon: 28, text: "text-[17px]", sub: "text-[11px]" },
  md: { icon: 34, text: "text-xl", sub: "text-xs" },
  lg: { icon: 40, text: "text-2xl", sub: "text-xs" },
  xl: { icon: 56, text: "text-[32px]", sub: "text-sm" },
} as const;

// Eight arcs, 45° each with a 9° gap. Arc index 1 spans ~49.5°–85.5° from 12 o'clock.
function arcPath(i: number, r: number, c: number) {
  const gap = 9;
  const start = i * 45 + gap / 2;
  const end = (i + 1) * 45 - gap / 2;
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
  };
  const [x1, y1] = toXY(start);
  const [x2, y2] = toXY(end);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function EighthWatchMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={arcPath(i, 15, 20)}
          stroke={i === 1 ? "var(--color-accent)" : "currentColor"}
          strokeOpacity={i === 1 ? 1 : 0.7}
          strokeWidth={4.5}
          strokeLinecap="butt"
        />
      ))}
      <circle cx="20" cy="20" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

export function ProhoriLogo({ size = "md", variant = "full", className = "" }: ProhoriLogoProps) {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";
  const s = SIZES[size];

  return (
    <span className={`inline-flex select-none items-center gap-2.5 text-text ${className}`}>
      <span className="text-pine dark:text-bone">
        <EighthWatchMark size={s.icon} />
      </span>
      {variant !== "icon" && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-semibold ${s.text} ${isBn ? "" : "tracking-normal"}`}
            lang={isBn ? "bn" : "en"}
          >
            {isBn ? "প্রহরী" : "prohori"}
          </span>
          {variant === "full" && size !== "sm" && (
            <span className={`mt-1 text-text-2 ${s.sub}`}>{t("app.wordmark_sub")}</span>
          )}
        </span>
      )}
    </span>
  );
}
