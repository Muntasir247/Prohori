/**
 * Custom Prohori visual assets from Doc 01 §11 (A1–A6).
 *
 * A1 uses the photoreal 3D hurricane lantern render (/assets/lantern-hero.jpg).
 * A2–A6 are minimal Night Watch vector illustrations using CSS token variables
 * exclusively (zero hardcoded hex colours, crisp at every DPI, theme-aware).
 * Nothing decorative appears on risk result screens.
 */

export function LanternHeroAsset({
  alt,
  className = "",
}: {
  alt: string;
  className?: string;
}) {
  return (
    <img
      src="/assets/lantern-hero.jpg"
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`aspect-square rounded-2xl border border-border bg-raat object-cover ${className}`}
    />
  );
}

/** A2: Empty-state hurricane lantern line art (1:1, 3 px uniform stroke, Lantern flame). */
export function LanternEmptyIllustration({
  className = "h-20 w-20",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Top bail handle */}
      <path
        d="M36 22C36 14 41 10 48 10C55 10 60 14 60 22"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Cap & hood */}
      <path
        d="M34 26H62M38 22H58"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Glass chimney */}
      <path
        d="M36 26C31 35 31 55 36 66H60C65 55 65 35 60 26"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Side guard tubes */}
      <path
        d="M34 32C25 38 25 56 32 66M62 32C71 38 71 56 64 66"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Steady Lantern flame */}
      <path
        d="M48 39C44.5 44 43 47.5 43 50.5C43 53.5 45.2 56 48 56C50.8 56 53 53.5 53 50.5C53 47.5 51.5 44 48 39Z"
        fill="var(--color-accent)"
      />
      {/* Base reservoir */}
      <rect
        x="28"
        y="66"
        width="40"
        height="12"
        rx="4"
        stroke="var(--color-text-2)"
        strokeWidth="3"
      />
      <path
        d="M24 82H72"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A3: Message-in-hand line art for Onboarding S08 step 2 (4:3). */
export function OnboardingHandIllustration({
  className = "h-28 w-36",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Smartphone body */}
      <rect
        x="52"
        y="16"
        width="56"
        height="88"
        rx="10"
        stroke="var(--color-text-2)"
        strokeWidth="3"
      />
      <path
        d="M72 24H88"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Highlighted Lantern message bubble on screen */}
      <rect
        x="62"
        y="38"
        width="36"
        height="24"
        rx="6"
        stroke="var(--color-accent)"
        strokeWidth="3"
      />
      <path
        d="M68 62L64 68L74 62"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Minimal outline fingers holding sides */}
      <path
        d="M52 52H42C38 52 36 55 36 59C36 63 38 66 42 66H52"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M108 46H118C122 46 124 49 124 53V74C124 84 117 92 108 94"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 74C44 88 52 100 66 104"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A4: Quiet check spot illustration for Weekly Tip S09 (3:2). */
export function WeeklyTipIllustration({
  className = "h-16 w-24 shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Open envelope */}
      <path
        d="M22 34V64C22 66.2 23.8 68 26 68H94C96.2 68 98 66.2 98 64V34L60 54L22 34Z"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M22 34L44 20M98 34L76 20"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Rising warning triangle */}
      <path
        d="M60 12L74 36H46L60 12Z"
        stroke="var(--color-risk-medium)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M60 21V27M60 31.5V32"
        stroke="var(--color-risk-medium)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A5: Flat masking diagram for S02 Safety ("What happens to your text", 3:2). */
export function MaskingDiagramIllustration({
  className = "w-full max-w-[440px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 360 150"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Left card: unmasked text bars */}
      <rect
        x="12"
        y="22"
        width="136"
        height="106"
        rx="12"
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth="2"
      />
      <rect x="28" y="44" width="96" height="10" rx="5" fill="var(--color-text-2)" />
      <rect x="28" y="68" width="104" height="10" rx="5" fill="var(--color-text-2)" />
      <rect x="28" y="92" width="76" height="10" rx="5" fill="var(--color-text-2)" />

      {/* Center Lantern arrow */}
      <path
        d="M162 75H196M188 66L197 75L188 84"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right card: sensitive segments covered by solid Pine masking blocks */}
      <rect
        x="212"
        y="22"
        width="136"
        height="106"
        rx="12"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />
      <rect x="228" y="44" width="44" height="10" rx="5" fill="var(--color-text-2)" />
      <rect x="278" y="42" width="48" height="14" rx="4" fill="var(--color-pine)" />

      <rect x="228" y="66" width="56" height="14" rx="4" fill="var(--color-pine)" />
      <rect x="290" y="68" width="42" height="10" rx="5" fill="var(--color-text-2)" />

      <rect x="228" y="92" width="32" height="10" rx="5" fill="var(--color-text-2)" />
      <rect x="266" y="90" width="46" height="14" rx="4" fill="var(--color-pine)" />
    </svg>
  );
}

/** A6: Reviewer desk spot illustration for Landing S01 "For fraud teams" (16:9). */
export function ReviewerDeskIllustration({
  className = "w-full max-w-[420px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Desk surface */}
      <path
        d="M24 146H296"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Laptop screen */}
      <rect
        x="48"
        y="36"
        width="156"
        height="96"
        rx="8"
        stroke="var(--color-text-2)"
        strokeWidth="3"
      />
      {/* Laptop base */}
      <path
        d="M36 132H216L208 146H44L36 132Z"
        stroke="var(--color-text-2)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Table rows inside screen */}
      <line x1="64" y1="56" x2="188" y2="56" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />
      {/* Highlighted Lantern row */}
      <rect
        x="62"
        y="68"
        width="128"
        height="16"
        rx="4"
        fill="var(--color-accent)"
        fillOpacity="0.22"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
      />
      <line x1="64" y1="98" x2="188" y2="98" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />
      <line x1="64" y1="114" x2="156" y2="114" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />

      {/* Notebook beside laptop */}
      <rect
        x="232"
        y="94"
        width="44"
        height="52"
        rx="5"
        stroke="var(--color-text-2)"
        strokeWidth="3"
      />
      <line x1="242" y1="108" x2="266" y2="108" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />
      <line x1="242" y1="120" x2="262" y2="120" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />
      <line x1="242" y1="132" x2="258" y2="132" stroke="var(--color-text-2)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
