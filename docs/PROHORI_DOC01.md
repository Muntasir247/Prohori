# **Prohori Doc 01: Brand Guidelines & UI/UX Design System**

Nov 7, 2026 · @Shaharia

This document is what a designer needs to build every Prohori screen without guessing. It covers the brand, the design system, 37 screen specifications, 61 UI image prompts, 2 logo prompts and 6 asset prompts. Technical detail lives in Doc 02\. The master reference and decision log live in Doc 03\.

## **1\. Brand identity and positioning**

Prohori is the watchman who stands between a pressured person and a payment they cannot take back. Every design decision serves one moment: someone has seconds to decide, and they are being rushed.

**Name.** Prohori (প্রহরী) means guardian or watchman. It comes from *prohor* (প্রহর), the traditional watch of the day, eight in every 24 hours. Use "Prohori" everywhere. The sheet's one use of "Prohori AI" is treated as an error (Doc 03, decision log).

| Element | Definition |
| :---- | :---- |
| Category | Bangla-first scam and payment-risk checker for mobile money users, with a fraud-team workbench |
| Audience | Primary: mobile money users in Bangladesh, especially first-time and rushed users. Secondary: fraud reviewers at providers |
| Promise | Check before you pay |
| Bangla promise | পাঠানোর আগে যাচাই করুন |
| Positioning | Awareness campaigns say "be careful". Prohori looks at your actual message, in your language, before the money moves |
| Personality | Calm, watchful, plain-spoken, on your side. Never alarmist, never clever |
| What it is not | A wallet, a bank, a budgeting tool or an authority. It holds no money and sees no account |

### **Voice rules**

| Rule | Write | Never write |
| :---- | :---- | :---- |
| Lead with the action | "Stop. Do not send money yet." | "Our AI detected anomalous behaviour." |
| Explain why, in plain words | "Real bKash staff never ask for your PIN." | "Risk score: 0.87" alone |
| Never promise safety | "We found no common warning signs. Still confirm who you are paying." | "This payment is safe." |
| Never blame | "These scams are made to rush anyone." | "You should have known." |
| Say what we do not know | "Prohori can be wrong. Your provider's helpline is the final check." | "100% accurate" |
| Use Bangla as first language | Write Bangla first, then adapt to English | Machine-translate English UI copy |

### **Three brand principles**

1. **The decision comes first.** The risk level and next step are visible before any explanation, within the first phone screen.  
2. **Calm beats alarm.** Scammers already create panic. Prohori slows the user down instead of adding noise.  
3. **Honest limits build trust.** Simulated-data status, caution on Low results and human review are visible, not buried.

**Prototype honesty rule.** While Prohori runs on simulated data, the footer and landing page say so: "Prototype. Uses simulated data." Never show invented customer counts, partner logos or accuracy claims.

## **2\. Logo direction**

The recommended mark is "The Eighth Watch": a ring of eight arcs with one lit. It draws on the eight prohor of the day and says one thing: someone is always awake. It avoids the shield that every security brand uses.

| Item | Specification |
| :---- | :---- |
| Primary logo | Symbol left, lowercase wordmark "prohori" right, Bangla প্রহরী optional beneath in lockups over 160 px wide |
| Symbol | Circular ring of 8 equal arcs separated by small gaps. Seven arcs in the base colour, one arc at the 1–2 o'clock position lit in Lantern. A small solid dot at the centre reads as both an eye and a flame |
| Wordmark | Custom-spaced Hanken Grotesk SemiBold, lowercase, tracking 0, with the dot of the "i" matching the symbol's centre dot |
| Bangla wordmark | Anek Bangla SemiBold প্রহরী. Keep the matra (headline) unbroken |
| Logo palette | Lantern \#F2C14E, Bone \#F3F1E8, Raat \#0C1614, Pine \#1F4D43 |
| Monochrome | All eight arcs one colour. The lit arc is drawn at full weight and the other seven at 45% stroke weight, so meaning survives with no colour |
| On light backgrounds | Seven arcs Pine \#1F4D43, lit arc Lantern \#F2C14E, wordmark Raat \#0C1614 |
| On dark backgrounds | Seven arcs Bone \#F3F1E8 at 70% opacity, lit arc Lantern, wordmark Bone |
| Favicon / app icon | Rounded square in Raat with the symbol only. Below 24 px, drop to 4 thick arcs with one lit and remove the centre dot |
| Clear space | One centre-dot diameter times 4 on all sides |
| Minimum size | Symbol 16 px. Full lockup 96 px wide |

Alternatives considered: a lantern silhouette (literal, weak at 16 px), an abstract প letterform (strong in Bangla, unreadable to partners) and a shield (generic). The Eighth Watch needs team approval (Doc 03, decision log).

### **Logo prompts**

**Prompt L1. Tool: ChatGPT image generation.** Purpose: primary logo sheet. Expected output: one clean vector-style board usable as a tracing reference.

Create a professional brand logo sheet for "Prohori", a Bangla-first FinTech product that helps people check scam messages before they send money. Prohori means guardian or watchman in Bangla.

Concept: "The Eighth Watch". Traditional Bengali time divides a day into eight watches called prohor. Draw a perfectly circular ring made of 8 identical thick arcs separated by 8 equal small gaps. Seven arcs are one quiet colour. Exactly one arc, in the 1 to 2 o'clock position, is lit in warm lantern yellow \#F2C14E. In the exact centre of the ring place one small solid circle that reads as both an eye and a flame. The meaning: someone is always awake.

Layout on a 16:9 board with a flat background split into two equal halves.  
Left half background \#0C1614: the seven arcs in \#F3F1E8, the lit arc in \#F2C14E, then to the right of the symbol the lowercase wordmark "prohori" in a clean grotesque sans serif, semi-bold weight, colour \#F3F1E8. The dot on the letter i matches the centre dot of the symbol.  
Right half background \#F7F5EE: the same lockup with the seven arcs in \#1F4D43, the lit arc in \#F2C14E and the wordmark in \#0C1614.  
Along the bottom edge show, small and evenly spaced: the symbol alone in solid black, the symbol alone in solid white on black, and a rounded-square app icon with background \#0C1614 containing the symbol.

Style: geometric, flat, precise, strong at 16 pixels, like a mark from an experienced identity studio. Uniform stroke, exact symmetry, generous clear space.

Do not include: shields, padlocks, keys, checkmarks, eyes with lashes, gradients, glow, 3D, bevels, shadows, glass effects, blue or purple colours, slogans, extra words, misspelled text, more or fewer than 8 arcs.  
**Prompt L2. Tool: ChatGPT image generation.** Purpose: app icon close-up for favicon tracing.

A single app icon for a FinTech brand called Prohori, centred on a plain \#F7F5EE background. Rounded square, corner radius 22 percent, solid fill \#0C1614. Inside, a perfectly circular ring of 8 identical thick arcs with equal small gaps. Seven arcs are \#F3F1E8 at 70 percent opacity. One arc in the 1 to 2 o'clock position is solid \#F2C14E. One small solid \#F2C14E dot sits in the exact centre. Flat vector style, exact symmetry, crisp edges, readable at 32 pixels. No text. No gradients, shadows, glow, 3D, shields or padlocks.

## **3\. Color system**

The palette is "Night Watch": near-black green, deep pine and one warm lantern yellow. It sits apart from Bangladesh's wallet brands, and it avoids blue-purple. All text pairs below were computed against WCAG 2.2; every one passes AA at 4.5:1 unless marked large-text only.

### **60:30:10 distribution**

| Share | Role | Colors | Where it goes |
| :---- | :---- | :---- | :---- |
| 60% | Base | Raat \#0C1614, Surface 1 \#13211E, Surface 2 \#1B2D29 | Page, cards, tables, modals |
| 30% | Secondary | Pine \#1F4D43, Pine Deep \#16382F, Bone \#F3F1E8 text | Sidebar active states, panels, secondary buttons, headings |
| 10% | Accent | Lantern \#F2C14E | Primary button, focus ring, active nav marker, logo arc. One primary action per view |

### **Core tokens**

| Token | Dark (default) | Light | Use |
| :---- | :---- | :---- | :---- |
| \--bg | \#0C1614 | \#F7F5EE | Page background |
| \--surface-1 | \#13211E | \#FFFFFF | Cards, inputs |
| \--surface-2 | \#1B2D29 | \#F0EEE5 | Raised cards, table header, hover row |
| \--border | \#2A3F3A | \#D9DDD3 | Hairlines, input borders |
| \--border-strong | \#4A635B | \#9AA89F | Hovered inputs, dividers that must be seen |
| \--text | \#F3F1E8 | \#10201C | Primary text |
| \--text-2 | \#A9B8B2 | \#4C5F58 | Secondary text, labels |
| \--text-muted | \#7E9088 | \#4C5F58 | Helper text. On dark it passes on bg and surface-1 only |
| \--pine | \#1F4D43 | \#1F4D43 | Secondary fill. Bone text on it is 8.43:1 |
| \--pine-hover | \#2A6355 | \#2A6355 | Secondary hover |
| \--accent | \#F2C14E | \#F2C14E | Primary button fill, always with Raat text (10.97:1) |
| \--accent-hover | \#F7D277 | \#E0AE36 | Primary hover |
| \--accent-text | \#F2C14E | \#7A5A00 | Accent used as text or link. Light value is 5.85:1 on paper |
| \--focus | \#F2C14E | \#1F4D43 | 2 px focus ring, 2 px offset |
| \--disabled-bg | \#1B2D29 | \#E8E7DF | Disabled fill |
| \--disabled-text | \#66776F | \#8A958E | Disabled text. WCAG exempts disabled controls |

### **Risk and status tokens**

Risk colors are reserved. They appear only on risk results, risk badges and risk charts.

| Token | Dark | Light | Tint (dark / light) | Meaning |
| :---- | :---- | :---- | :---- | :---- |
| \--risk-high | \#FF6B5E | \#C4291F | \#3A1714 / \#FBEBE9 | High risk. Icon: octagon. Word: High |
| \--risk-medium | \#FF9F45 | \#A85400 | \#3A2510 / \#FBEFE2 | Medium risk. Icon: triangle. Word: Medium |
| \--risk-low | \#9DB4C0 | \#3F5E6E | \#1D2A30 / \#E9EFF2 | Low risk. Icon: circle-info. Word: Low |
| \--success | \#4CC38A | \#1E7A4C | \#12301F / \#E4F3EA | System success only, such as "Report sent" |
| \--warning | \#FF9F45 | \#A85400 | same as medium | System warnings outside risk results |
| \--error | \#FF6B5E | \#C4291F | same as high | Form and system errors |
| \--info | \#7CC0EC | \#1F6AA5 | \#14293A / \#E6F0F8 | Neutral information |

**Low risk is never green.** Green reads as "safe", and Prohori may never say a payment is safe. Low uses a cool slate with a caution line. This rule is non-negotiable.

**Risk is never colour alone.** Each level always carries its word, its icon shape and, on the result screen, a position on a three-step meter.

**Lantern never appears on a risk surface.** Yellow beside orange would blur Medium. On result screens, the primary button switches to a Bone fill with Raat text.

### **Chart colors**

| Series | Dark | Light | Use |
| :---- | :---- | :---- | :---- |
| Risk series | use risk tokens | use risk tokens | Cases by risk level, stacked in High, Medium, Low order |
| Category 1 | \#5FB7A5 | \#1F6F5F | Scam type 1 |
| Category 2 | \#F2C14E | \#8A6700 | Scam type 2 |
| Category 3 | \#7CC0EC | \#1F6AA5 | Scam type 3 |
| Category 4 | \#D99BB0 | \#9A3F60 | Scam type 4 |
| Category 5 | \#A9B8B2 | \#4C5F58 | Scam type 5, Other |
| Grid | \#2A3F3A | \#D9DDD3 | Gridlines, 1 px |
| Axis text | \#A9B8B2 | \#4C5F58 | Tick labels |

Charts show at most five categories; group the rest into Other. Reviewer decisions use Pine for confirmed, Bone outline for rejected.

## **4\. Typography**

Use Hanken Grotesk for English, Anek Bangla for Bangla headings, Noto Sans Bengali for Bangla body text and IBM Plex Mono for masked numbers and IDs. All four are free on Google Fonts. Bangla needs a larger size and more line height than English at the same role.

| Role | English | Bangla | Why |
| :---- | :---- | :---- | :---- |
| Display, headings | Hanken Grotesk 600–700 | Anek Bangla 600–700 | Hanken is confident without the generic fintech look. Anek has a sturdy, modern matra at large sizes |
| Body, labels, buttons | Hanken Grotesk 400–600 | Noto Sans Bengali 400–600 | Noto has the most complete conjunct coverage and renders well on low-end Android |
| Financial figures | Hanken Grotesk 500 with font-variant-numeric: tabular-nums | Noto Sans Bengali 500, Bangla digits in Bangla UI | Aligned columns |
| Masked numbers, hashes, case IDs | IBM Plex Mono 400–500 | IBM Plex Mono | Masked values look deliberately machine-made: \+880 17\*\* \*\*\*678 |

### **Type scale**

| Token | English size / line | Bangla size / line | Weight | Use |
| :---- | :---- | :---- | :---- | :---- |
| display | 56 / 64 | 56 / 72 | 700 | Landing hero. 36 / 44 on mobile, Bangla 36 / 48 |
| h1 | 36 / 44 | 36 / 50 | 700 | Page title |
| h2 | 28 / 36 | 28 / 40 | 600 | Section title, risk headline |
| h3 | 22 / 30 | 22 / 32 | 600 | Card title |
| h4 | 18 / 26 | 18 / 28 | 600 | Sub-section |
| body-lg | 18 / 28 | 19 / 32 | 400 | Result explanation |
| body | 16 / 24 | 17 / 28 | 400 | Default |
| body-sm | 14 / 20 | 15 / 24 | 400 | Tables, helper text |
| label | 14 / 20 | 15 / 22 | 600 | Form labels, buttons |
| caption | 12 / 16 | 13 / 20 | 500 | Chart ticks, meta. Never Bangla below 13 px |
| data-xl | 40 / 44 | 40 / 48 | 600 | KPI values |

### **Bangla rules**

* Set lang="bn" on the root so screen readers and the browser choose correctly. Font stack: "Noto Sans Bengali", "Hanken Grotesk", sans-serif, with the Bangla font first so mixed Banglish renders well.  
* Letter spacing stays 0\. Positive tracking breaks the matra into separate pieces.  
* Never italicise or uppercase Bangla. Use weight for emphasis.  
* Never clip line height. Vowel signs such as ু and ৃ hang below the baseline and clip inside tight containers.  
* Use ৳ for currency in Bangla (৳৫,০০০) and Tk 5,000 in English. Use South Asian grouping: 1,25,000.  
* Keep masked values, case IDs and HTTP-like codes in Latin digits in both languages.  
* Load only Regular, Medium, SemiBold and Bold with font-display: swap. Subset Latin weights to protect low-end phones.

### **English rules**

Use sentence case everywhere. Reserve uppercase for table column labels at caption size with 0.04em tracking. Headings use tracking \-0.01em at 28 px and above.

## **5\. Design tokens, grid and spacing**

All values live as CSS variables and map into Tailwind. Components never hard-code a color, radius or size.

| Group | Tokens |
| :---- | :---- |
| Spacing (px) | 1\=4, 2\=8, 3\=12, 4\=16, 5\=20, 6\=24, 8\=32, 10\=40, 12\=48, 16\=64, 20\=80, 24\=96 |
| Radius (px) | sm\=6 chips, md\=8 inputs and buttons, lg\=12 cards, xl\=16 modals, full\=pills |
| Shadow, dark | Avoid shadows. Elevation is surface-2 plus a 1 px border. Modals only: 0 16px 40px rgba(0,0,0,.45) |
| Shadow, light | sm: 0 1px 2px rgba(16,32,28,.06). md: 0 8px 24px rgba(16,32,28,.08) |
| Breakpoints | sm 360–639, md 640–1023, lg 1024–1439, xl 1440+ |
| Grid | 4 columns with 16 px gutters on sm, 8 with 24 on md, 12 with 24 on lg and up |
| Containers | Public 1200 px max. Reader flows (check, result) 640 px max. App 1320 px max with a 256 px sidebar. Sidebar collapses to 72 px rail at lg below 1200 |
| Page gutter | 16 px sm, 24 px md, 32 px lg |
| Icon size | 16 in tables, 20 default, 24 in nav, 32 in empty states, 48 on risk banner |
| Button height | sm 36, md 44, lg 52\. Touch target at least 44 px |
| Button padding | sm 12, md 16, lg 24\. Icon gap 8 |
| Input | Height 48, padding 12 / 16, radius md, 1 px border, label above, helper below. Textarea min height 168 |
| Card | Padding 24 on lg, 16 on sm, radius lg, 1 px border, no shadow on dark |
| Table row | 52 px default, 40 px dense. Header 40 px |
| Motion | 120 ms hover, 200 ms panels, 280 ms page. Ease cubic-bezier(.2,.8,.2,1). Respect prefers-reduced-motion. No looping decorative animation |

**Layering.** Base 0, sticky header 10, sidebar 20, dropdown 30, modal 40, toast 50\.

## **6\. Iconography**

Use one set only: Phosphor through Iconify (ph: prefix), Regular weight at 1.5 px optical stroke. Use Bold only on the risk banner, and never mix in another set. Phosphor is friendlier than the usual Lucide look while staying precise.

| Concept | Iconify name | Concept | Iconify name |
| :---- | :---- | :---- | :---- |
| Message check | ph:chat-text | Risk High | ph:octagon-bold with ph:hand-palm inside the banner |
| Payment check | ph:paper-plane-tilt | Risk Medium | ph:warning-bold |
| History | ph:clock-counter-clockwise | Risk Low | ph:info-bold |
| Report | ph:flag | Stop / pause | ph:hand-palm |
| Helpline | ph:phone-call | Share | ph:share-network |
| Already sent money | ph:siren | Read aloud | ph:speaker-high |
| Knowledge base | ph:books | Scam campaign | ph:graph |
| Case queue | ph:tray | Repeat number | ph:repeat |
| Overview | ph:squares-four | Reports | ph:file-csv |
| Reviewer note | ph:note-pencil | Audit log | ph:list-magnifying-glass |
| Settings | ph:gear-six | Notifications | ph:bell |
| Language | ph:translate | Theme | ph:moon-stars |
| API keys | ph:key | Prompts and quality | ph:gauge |
| Users | ph:users-three | Safe actions | ph:list-checks |
| Filter | ph:funnel | Search | ph:magnifying-glass |
| Sort | ph:arrows-down-up | Export | ph:download-simple |
| Close | ph:x | Menu | ph:list |
| Back | ph:arrow-left | Forward | ph:arrow-right |
| Success | ph:check-circle | Error | ph:x-circle |

**Rules.** Icons sit left of labels at 8 px gap. Icon-only buttons need aria-label and a tooltip. Never use a checkmark on a Low result. Never use a shield icon for risk status.

## **7\. Component library**

Every screen is built from these 29 components, on Radix primitives with Tailwind tokens. Each one has default, hover, focus, active, disabled, loading and error states where relevant.

| Component | Variants | Key specification |
| :---- | :---- | :---- |
| Button | Primary, Secondary, Ghost, Danger, Calm (Bone fill on risk screens) | Heights 36 / 44 / 52\. Loading shows a spinner and keeps width |
| IconButton | Ghost, Outline | 44 px square hit area |
| Input | Text, Password, Search, Amount | 48 px. Amount shows a ৳ prefix and groups on blur |
| Textarea | Message | 168 px min, counter at 4,000 characters, paste button on mobile |
| Select | Single | Radix Select with searchable list above 8 options |
| Dropdown menu | Row actions, Account menu | Min width 200, item height 40 |
| SegmentedControl | 2–4 options | Used for known or new recipient, and date ranges |
| ChoiceChip | Single, Multi | Pill, 40 px height. Used for channel and filters |
| Navbar | Public, App mobile | 72 px, sticky, Surface 1 with bottom border. No floating glass bar |
| Sidebar | User, Reviewer, Admin | 256 px, active item has 3 px Lantern marker left and Pine fill |
| BottomNav | User mobile | 64 px, four items: Check, History, Alerts, Settings |
| Card | Base, Stat, Action | Radius 12, border 1 px |
| RiskBanner | High, Medium, Low, Unavailable | Full width of reader column, tint fill, 48 px icon, level word, one-line instruction |
| RiskBadge | High, Medium, Low | 24 px, icon plus word, tint fill |
| RiskMeter | 3 steps | Three segments, active one filled. Never a percentage |
| Modal | Confirm, Form | Max 520 px. Focus trapped. Bottom sheet on sm |
| Table | Standard, Dense | Sticky header, row hover, sortable headers, cards on sm |
| Chart frame | Line, Stacked bar, Bar, Donut (avoid) | Title, range control, legend above, data table toggle for accessibility |
| Alert | Info, Success, Warning, Error | Inline, icon, text, optional action |
| Badge | Status, Count, Role | Case status colors follow Section 3, neutral by default |
| Tooltip | Default | 200 ms delay, keyboard reachable, never holds required information |
| Tabs | Underline | 44 px. Lantern underline 2 px |
| Pagination | Numbered, Load more | Numbered on tables, Load more on mobile history |
| Toast | Success, Error | Bottom right, bottom on sm. 5 s, stays on hover. Never for risk results |
| Notification item | Unread, Read | Dot, icon, title, time |
| Skeleton | Text, Card, Table row | Shimmer off for reduced motion |
| PipelineSteps | 4 steps | Stage labels during a check, never a percentage |
| HighlightedMessage | Read-only | Masked text with underlined flagged spans, tap to see the reason |
| EmptyState | With or without action | 32 px icon or small illustration, one line, one action |

Case status colors: New uses \--info, In review uses \--text-2 outline, Confirmed scam uses \--risk-high, Not a scam uses \--text-2, Escalated uses \--risk-medium, Closed uses \--surface-2.

## **8\. UI patterns, responsive rules and accessibility**

The user side is a calm, single-column reader on a phone. The reviewer side is a dense, wide workbench on a laptop. They share tokens but not layouts.

### **UI patterns**

| Pattern | Rule |
| :---- | :---- |
| Result hierarchy | Banner, then the one instruction, then reasons, then the flagged message, then more actions. Nothing above the banner except the back link |
| One primary action | One filled button per view. On a High result it is the helpline action |
| Forms | Single column, label above, validate on blur, error text under the field naming the fix |
| Progressive disclosure | Reasons are visible. Evidence and method sit behind "How Prohori decided" |
| Loading | Skeleton for data. PipelineSteps for checks. Never a blank screen |
| Empty state | Says what will appear here and the one action that fills it |
| Error | Says what happened, what was not lost and what to do. Never a raw code |
| Destructive action | Modal with the object named and a typed or two-step confirm |
| Simulated data | Reviewer screens carry a small "Simulated data" badge in the header |
| Masking | Masked values use mono type. Never reveal an unmasked number in the UI |

### **Responsive rules**

| Width | User app | Reviewer and admin |
| :---- | :---- | :---- |
| 360–639 | Single column, BottomNav, full-width buttons, sticky bottom action on result | Read-only support. Queue as cards. Decisions allowed but charts stack |
| 640–1023 | Single column at 640 px centred, BottomNav | Sidebar becomes a drawer. Two-column KPIs |
| 1024–1439 | Sidebar plus 640 px reader | Sidebar rail or full. Tables full width. Case detail 2 columns |
| 1440+ | Same, content centred | 12-column layout. Case detail 8 \+ 4 columns |

The user flow must work at 360 px on a slow 3G-class connection. Target under 200 KB of critical JS and CSS on first load, and lazy-load Recharts so public and user routes never pay for it.

### **Accessibility requirements (WCAG 2.2 AA)**

* Text contrast at least 4.5:1, large text and UI parts at least 3:1, as computed in Section 3\.  
* Full keyboard path with visible 2 px focus. Skip link on every page.  
* Risk result moves focus to the banner heading and announces through aria-live="assertive".  
* Every chart has a data-table toggle. Every icon button has a label.  
* Touch targets at least 44 px. Text scales to 200% without horizontal scroll.  
* Pressure Pause never traps keyboard or screen-reader users, and it can be skipped.  
* Bangla copy is read by real Bangla readers before release, including an older reader and a first-time smartphone user.

## **9\. Screen-by-screen design specifications**

Prohori has 37 screens: 8 public, 15 user, 6 reviewer, 6 admin and 2 system. A check needs no account, because a login wall at the moment of pressure would defeat the product. API names match Doc 02, Section 9\.

### **Defaults for every screen**

| Attribute | Default unless a screen says otherwise |
| :---- | :---- |
| Loading | Skeleton matching the final layout |
| Network error | Inline Alert with Retry, entered data kept |
| Session expired | Redirect to login, then return to the same page. Guest flows are unaffected |
| Permission | Server decides. A forbidden route shows S36 (403) |
| Language | ph:translate control in header or settings, saved per device and account |
| Footer | Public pages only: Safety, Privacy, "Prototype. Uses simulated data." |
| Icons | Phosphor names from Section 6 |

### **Public and account screens**

#### **S01 Landing /**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Explain Prohori in five seconds and start a check. Anyone, including hackathon judges |
| Layout | Full-width dark page, 1200 px container. Sections: hero, try-a-sample, three checks, how it works, safety promises, reviewer preview, final CTA, footer |
| Header, nav | Logo left. Links: How it works, Safety, For fraud teams. Right: language toggle, Sign in (Ghost), Check a message (Primary) |
| Hero | Eyebrow: "Before you press send". H1: "Check before you pay." Sub-line. Primary "Check a message". Secondary "Check a payment". Right: lantern asset A1 |
| Cards, components | Three Action cards (Message, Payment, Already sent money). Four numbered steps. Four safety promise rows. Reviewer dashboard screenshot on a flat Surface 1 frame |
| Sample chips | F35. Three chips: fake bKash staff, prize SMS, wrong-number refund. Tap fills S10 and labels the sample as simulated |
| Data, API | Static copy. Sample text from GET /api/v1/samples. Stats cite Bangladesh Bank with year |
| States | Sample load failure hides the chips. Nothing else depends on the API |
| Responsive | Hero stacks, asset moves under the buttons at 240 px. Reviewer preview hidden below 640 px |
| Destinations | S10, S11, S18, S02, S03 |

#### **S02 Safety and privacy /safety**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Show what Prohori does and does not do, so a cautious user or partner can trust it |
| Layout | Reader column, 640 px. Header as S01 |
| Main sections | What we check. What we never ask for (OTP, PIN, password). What happens to your text (masked before storage and before AI). What Prohori cannot do. Prototype status. Consent and data deletion. Who reviews reports |
| Components | Definition rows with icons, one Alert for prototype status, FAQ accordion |
| CTAs | Check a message. Contact provider helplines (scrolls to safe-action list from GET /api/v1/safe-actions) |
| States | Static. Safe-action failure shows "Use the number in your provider's official app" |
| Responsive | Same at all widths |

#### **S03 Login /login**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Sign in for history and reviewer access. Optional for users |
| Layout | Centered 420 px card on Raat. No split hero. Logo above |
| Inputs, validation | Email (valid format). Password (required). Show-password icon button |
| CTAs | Sign in (Primary). Forgot password (link). Create account (link). "Check without an account" (Ghost) |
| API | POST /api/v1/auth/login |
| States | Loading on button. Error: "Email or password is wrong", never which one. 429: "Too many tries. Wait 15 minutes". Unverified: link to S05 |
| Success | User to S09 (or S08 if onboarding incomplete). Reviewer to S24. Admin to S24 |
| Responsive | Card fills width with 16 px gutter |

#### **S04 Register /register**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Create an optional account to keep history. Reviewer accounts are invite-only and do not use this page |
| Layout | As S03. Top line: "You do not need an account to check a message." |
| Inputs, validation | Name (2–80 chars). Email. Password (10+ chars, strength hint). Language select. Consent checkbox to the privacy note, required |
| CTAs | Create account (Primary). Sign in (link) |
| API | POST /api/v1/auth/register |
| States | Same response whether or not the email exists, to stop account discovery. Field errors inline |
| Success | S05 |

#### **S05 Verify email /verify-email**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Confirm the email with a link, not a code. Prohori never teaches users to read out codes |
| Layout | Centered card. Envelope icon, masked email, instruction, Resend |
| States | Waiting. Token valid: "Email confirmed", then S08. Token expired: Resend. Resend limited to 3 per hour, with a timer |
| API | POST /api/v1/auth/verify-email, POST /api/v1/auth/resend-verification |

#### **S06 Forgot password /forgot-password**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Start recovery |
| Layout, inputs | Centered card. Email only |
| API, states | POST /api/v1/auth/forgot-password. Always shows "If this email has an account, we sent a link" |
| Destination | S03 |

#### **S07 Reset password /reset-password**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Set a new password from a one-time link |
| Inputs, validation | New password (10+), confirm (match) |
| API, states | POST /api/v1/auth/reset-password. Expired link offers a new request. Success revokes all sessions and goes to S03 with a toast |

#### **S08 Onboarding /onboarding**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | In under 30 seconds, set language and teach the three rules. New accounts only; skippable |
| Layout | Reader column with 3-step indicator |
| Step 1 | Language: two large cards, বাংলা and English |
| Step 2 | "How to use Prohori": copy the message, paste it, read the result. Three numbered rows with small illustrations |
| Step 3 | "Three promises": we never ask for OTP or PIN, we can be wrong, you stay in control. One "I understand" button |
| CTAs | Next, Back, Skip. Final: Start checking |
| API | PATCH /api/v1/me with language, onboarding\_completed |
| States | Failure saves locally and retries next load |
| Destination | S09 |

### **User app screens**

Mobile shell: top bar (logo, language), BottomNav (Check, History, Alerts, Settings). Desktop shell: 256 px sidebar with the same four items. Guests see Check only, plus a quiet "Sign in to keep history" link.

#### **S09 Check home /check**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | The user's main dashboard: start a check within one tap. Balance, income and expenses from the brief's example do not apply, because Prohori sees no wallet |
| Layout | Reader column. Greeting line, then two large Action cards, then the urgent row, then recent checks |
| Cards | Check a message (ph:chat-text). Check a payment (ph:paper-plane-tilt). Red-outlined row "I already sent money" (ph:siren) |
| Recent checks | Last 3: RiskBadge, short type, time. Signed-in users only |
| Weekly tip | One Card from the knowledge base: "This week's common scam", from GET /api/v1/tips/current. Hidden if none |
| API | GET /api/v1/checks?limit=3, GET /api/v1/tips/current |
| Empty | "Your checks will appear here." Guests see no empty block |
| Destinations | S10, S11, S18, S19, S20 |

#### **S10 Message Check /check/message**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Paste a suspicious SMS or chat |
| Layout | Reader column. Back link, H1 "Paste the message", Textarea, optional details accordion, sticky Check button |
| Inputs | Message: required, 10–4,000 chars, Bangla, English or Banglish. Counter shows at 3,500+. Paste button on mobile |
| Optional details | "Who did it claim to be?" select: bKash, Nagad, Rocket, Upay, Bank, Other, Not sure. "Add payment details" link opens S11 fields inline |
| Warning | Above Textarea: "Do not paste your own PIN or OTP." If digits look like a code, the server strips them; the UI says "We removed a possible code" |
| Sample chips | Small link "Try a sample" fills simulated text |
| CTAs | Check message (Primary, disabled until valid) |
| API | POST /api/v1/check-message |
| Errors | Too short, too long (with count). 429: S37. Network: keep text, Retry |
| Destination | S12, then S13–S16 |

#### **S11 Payment Check /check/payment**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Check a payment request when there is no message, or add to one |
| Layout | Reader column with four grouped questions, one screen, no wizard |
| Inputs | Amount (BDT, 1–10,000,000; Bangla digits accepted). Recipient: SegmentedControl Known / New / Not sure. Recipient number (optional, BD format). How the request reached you: ChoiceChips Phone call, SMS, WhatsApp/Messenger, In person, Online shop, Other. Are you being rushed? Yes / No / Not sure. Optional message box |
| Time | Taken automatically from the device; not asked |
| Dropdowns | Provider: bKash, Nagad, Rocket, Upay, Other |
| CTAs | Check payment (Primary) |
| API | POST /api/v1/check-payment |
| Validation | Invalid number shows the expected format: 01XXXXXXXXX. Amount over limit shows the range |
| Destination | S12, then S13–S16 |

#### **S12 Checking (state of S10 and S11)**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Show real progress and stop a rushed user from leaving |
| Layout | Reader column. PipelineSteps with four labels: Hiding private details, Checking known warning signs, Comparing with known scams, Writing your result |
| Behaviour | Steps name the pipeline stages in order and advance on a timer, because the MVP POST returns one response. No percentage is shown. Target under 6 s |
| States | After 10 s: "Taking longer than usual." After 15 s: S16 |
| API | Waits on the same POST. No separate call |

#### **S13 Result: High risk /result/:id**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Stop the payment and give one safe action |
| Layout, order | RiskBanner (High tint, octagon, "High risk. Stop. Do not send money."), RiskMeter, Pressure Pause, Why this looks risky (2–4 reasons), HighlightedMessage, What to do now, more actions |
| Pressure Pause | F32. 10-second calm countdown with "Take a breath. Scammers want you to rush." Actions stay visible. A "Skip" link is always present, because Prohori never blocks |
| Next steps | Fixed safe actions from the list. Primary (Calm style): Call provider helpline, a tel: link. Provider picked from the check or a select |
| More actions | Report this message (S17), Ask someone you trust (share), Read aloud, I already sent money (S18), How Prohori decided (accordion) |
| How Prohori decided | Signals used, matched scam pattern name, limits. No model names on user screens |
| API | GET /api/v1/checks/{id}, POST /api/v1/checks/{id}/pause-ack |
| Copy rule | Caution line: "Prohori can be wrong. Your provider's official helpline is the final check." |
| Responsive | Sticky bottom: Call helpline. On desktop, inline |

#### **S14 Result: Medium risk**

Same layout as S13 with Medium tint, triangle icon and "Medium risk. Check before you send." No Pressure Pause. Primary (Calm): "Confirm with the person another way". Secondary: Call helpline, Report. Reasons list names what is unclear.

#### **S15 Result: Low risk**

Same layout with Low tint, info icon and "Low risk. We found no common warning signs." Mandatory caution directly under the headline: "This does not mean the payment is safe. Confirm the number before you send." No green, no checkmark. Primary: "Check another". Secondary: Report anyway.

#### **S16 Result: Unavailable (fallback)**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Stay useful when the model or network fails |
| Layout | Neutral banner (\--info), "We could not finish this check." Rule-based warning signs if any ran. Fixed advice: do not share OTP or PIN, do not send money until confirmed, call the helpline |
| Risk shown | If rules fired, show their level. Otherwise show no level. Never show Low by default |
| CTAs | Try again. Call helpline |

#### **S17 Report this message (modal)**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Send a masked copy to the fraud-team queue with consent |
| Layout | Modal, bottom sheet on sm. Masked preview, optional note (500 chars), consent checkbox |
| Copy | "A person will review this. Reporting does not block anyone or get money back." |
| API | POST /api/v1/checks/{id}/report |
| Success | Inline "Report sent. Reference PRO-000123." Duplicate report shows the same reference |

#### **S18 Already Sent Money /already-sent**

| Attribute | Specification |
| :---- | :---- |
| Purpose | F34. Fast, ordered steps after a payment, when every minute counts. No account or check needed |
| Layout | Reader column. Headline "Act now. Do this first." Numbered list of four actions with large buttons |
| Steps | 1 Call your provider's official helpline (provider picker, tel: link). 2 Keep the transaction ID and screenshots; do not delete messages. 3 Do not pay anyone who offers to recover it. 4 Report it to the police or the official channels, per the verified safe-action list |
| Honest line | "Recovery is not guaranteed. Calling quickly gives the best chance." |
| API | GET /api/v1/safe-actions?context=after\_payment (cached offline) |
| States | Works offline from the service-worker cache |

#### **S19 History /history**

| Attribute | Specification |
| :---- | :---- |
| Purpose, user | Signed-in users see past checks. Guests are prompted to sign in |
| Layout | Filter row, then list of rows (cards on mobile) |
| Filters | Risk: All, High, Medium, Low. Type: Message, Payment. Date: 7 days, 30 days, Custom |
| Row | RiskBadge, one-line summary, matched scam type, date, report status |
| API | GET /api/v1/checks |
| Empty | "No checks yet." Button: Check a message |
| Pagination | Load more, 20 at a time |

#### **S20 Check detail /history/:id**

Read-only S13–S15 without Pressure Pause, with report status and Delete this check (confirm modal, DELETE /api/v1/checks/{id}).

#### **S21 Shared result /s/:token**

| Attribute | Specification |
| :---- | :---- |
| Purpose | F33. A trusted family member sees the masked result and can advise |
| Layout | Public reader page with no app shell. Banner, reasons, masked message, "What you can do" and expiry |
| Privacy | Masked content only, no names, noindex, expires in 24 hours, owner can revoke |
| API | GET /api/v1/shares/{token} |
| States | Expired: "This link has expired". Invalid: same page, so tokens cannot be probed |

#### **S22 Settings /settings**

| Attribute | Specification |
| :---- | :---- |
| Layout | Tabs: Profile, Preferences, Security, Your data |
| Profile | Name, email (read-only), Save |
| Preferences | Language, theme (System, Dark, Light), text size (Normal, Large), read-aloud default |
| Security | Change password, active sessions list, Sign out everywhere |
| Your data | Export my checks (JSON), Delete account (type DELETE). Consent record |
| API | GET/PATCH /api/v1/me, POST /api/v1/me/password, GET/DELETE /api/v1/me/sessions, GET /api/v1/me/export, DELETE /api/v1/me |
| Logout | Button at bottom of the Security tab and in the account menu: POST /api/v1/auth/logout, then S01 |

#### **S23 Notifications /notifications**

| Attribute | Specification |
| :---- | :---- |
| Purpose | In-app updates: report status changed, new common scam, security event |
| Layout | List of Notification items, Mark all read, All / Unread Tabs |
| API | GET /api/v1/notifications, POST /api/v1/notifications/read |
| Empty | "No alerts. We will tell you when a report you sent is reviewed." |

### **Reviewer screens**

Shell: 256 px sidebar with Overview, Case queue, Repeat numbers, Campaigns, Reports. Header: page title, date range, "Simulated data" badge, notifications, account menu. Role: reviewer or admin. All masked, no unmasked number anywhere.

#### **S24 Review Overview /review**

| Attribute | Specification |
| :---- | :---- |
| Purpose | See queue pressure and trends in 10 seconds |
| Layout | Row of 4 Stat cards, then 8 \+ 4 column row, then 6 \+ 6 row |
| KPIs | Open cases, High-risk today, Median time to decision, Reviewer agreement with Prohori |
| Charts (Recharts) | Cases by risk level over time (stacked bar). Top scam types (bar, max 5). Repeated risky numbers over time (line). Reviewer decisions (stacked bar) |
| Campaign Radar | F36. Alert row at top when a campaign grows, for example "Refund scam reports doubled in 7 days". Links to S28 |
| Filters | Date: 7, 30, 90 days, Custom. Scam type. Risk level. Persist in the URL |
| API | GET /api/v1/analytics/overview |
| Empty | "No cases in this range." Clear filters |
| Refresh | Polls every 60 s, as the sheet has no streaming. Shows last-updated time |
| Responsive | Cards stack, charts stack, table toggle stays |

#### **S25 Case Queue /review/cases**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Work reported cases in priority order |
| Layout | Tabs, filter bar, table, pagination |
| Tabs | New, In review, Decided, All, with counts |
| Filters | Risk, scam type, assignee (Me, Anyone), date. Search by reference |
| Columns | Reference, RiskBadge, scam type, masked sender, report count for number, age, assignee, status |
| Row actions | Open, Assign to me |
| Bulk | Assign selected. No bulk decisions, as each action needs human judgment |
| Sort | Default: High first, then oldest |
| API | GET /api/v1/cases, PATCH /api/v1/cases/{id} |
| Empty | "Queue is clear." Link to Decided |
| Responsive | Below 640 px, rows become cards |

#### **S26 Case Detail /review/cases/:id**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Give one reviewer everything needed for a defensible decision |
| Layout | 8 \+ 4 columns. Left: case header, HighlightedMessage, Prohori's assessment, evidence, similar cases. Right: decision panel, notes, timeline |
| Assessment | Final level, rule hits, LLM level, model score, reasons |
| Trace panel | Prompt version, model name, retrieved pattern IDs, risk score, route, latency, fallback flag |
| Decision panel | Radios: Confirmed scam, Not a scam, Needs escalation, Close without action. Scam type select. Required reason (10–500 chars). Confirm button |
| Second-step modal | "This records your decision and updates the number's status. It does not block anyone." |
| Notes | Add note, reverse-chronological list |
| Timeline | Audit events for this case |
| API | GET /api/v1/cases/{id}, POST /cases/{id}/decision, POST /cases/{id}/notes |
| Conflict | If another reviewer changed it, 409: "This case changed. Reload to see the latest." Note text is kept |
| Success | Toast, next-case button |

#### **S27 Repeat Numbers /review/numbers**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Find numbers behind many reports |
| Layout | Filters, table, side drawer |
| Columns | Masked number (mono), reports, checks, High share, first seen, last seen, status |
| Status | Watch, Confirmed risky, Cleared. Changing status needs a reason and goes to audit |
| Drawer | 30-day sparkline, linked cases |
| API | GET /api/v1/analytics/numbers, PATCH /api/v1/analytics/numbers/{id} |

#### **S28 Scam Campaigns /review/campaigns**

| Attribute | Specification |
| :---- | :---- |
| Purpose | F27. See groups of near-identical messages as one campaign |
| Layout | Card grid, then detail drawer |
| Card | Campaign label (reviewer editable), scam type, messages, 7-day change, last seen |
| Drawer | Representative masked messages, shared numbers, cases, Rename, Merge |
| API | GET /api/v1/campaigns, PATCH /api/v1/campaigns/{id} |
| Empty | "Not enough reports to form a campaign yet." Needs at least 5 similar messages |

#### **S29 Reports and Export /review/reports**

| Attribute | Specification |
| :---- | :---- |
| Purpose | Export reviewed cases as CSV |
| Layout | Form Card, recent exports Table |
| Inputs | Date range (required, max 366 days), status, scam type |
| CTAs | Export CSV. Download |
| API | GET /api/v1/cases/export.csv |
| Validation | Empty range shows "No reviewed cases in this range" |
| Note | Exports are masked and logged to audit |

### **Admin and system screens**

Admin adds a sidebar group below reviewer items: Knowledge base, Safe actions, Quality, Users, API keys, Audit log. Admin only.

| Screen | Purpose | Layout and controls | API | Empty, error |
| :---- | :---- | :---- | :---- | :---- |
| S30 Knowledge Base /admin/knowledge | Manage scam-pattern documents | Table: title, scam type, language, status, chunks, updated. Filters: scam type, language, status. New document form: title, type, source URL, language, body. Publish triggers chunking and embedding | GET/POST/PATCH /api/v1/admin/knowledge | Empty offers "Add first pattern". Embedding failure leaves status Draft with Retry |
| S31 Safe Actions /admin/safe-actions | Control the only next steps the model may use | Table: ID, English, Bangla, phone, min level, verified date, source link, active. Inactive until source URL and verified date exist | GET/POST/PATCH /api/v1/admin/safe-actions | Warns on any helpline not re-verified in 90 days |
| S32 Quality /admin/quality | Show evaluation and cost | KPIs: High precision, High recall, genuine flagged High, unsafe flags. Table of eval runs by prompt version. Route mix and cache hit chart. Activate version button, blocked if unsafe flags above 0 | GET /api/v1/admin/quality, POST /api/v1/admin/prompts/{id}/activate | Label: "Measured on simulated data only" |
| S33 Users /admin/users | Manage roles | Table: name, email, role, status, last active. Invite reviewer modal: email, role. Change role, Deactivate (confirm) | GET/POST/PATCH /api/v1/admin/users | Cannot remove the last admin |
| S34 API Keys /admin/api-keys | Partner access (F30) | Table: name, prefix, scopes, rate limit, last used. Create shows the key once, with copy. Revoke (confirm). Docs link to /docs | GET/POST/DELETE /api/v1/admin/api-keys | Warning that the key will not be shown again |
| S35 Audit Log /admin/audit | Trace every reviewer and admin action | Read-only table: time, actor, role, action, object, before and after diff drawer. Filters: actor, action, date | GET /api/v1/admin/audit | Nothing is editable |
| S36 Error pages | 404, 403, 500 in one template | Centered card, short message, Go home, on 500 a reference ID | none | The message always keeps "Stop and call your helpline" link on check routes |
| S37 Offline and rate limited | Keep users safe when the app cannot check | Offline banner plus cached S18. 429 card: wait time, fixed safe advice, helpline list | Service worker cache | Text the user typed stays in the form |

## **10\. UI image-generation prompts**

Every prompt below is written for **ChatGPT image generation** and works alone: paste one prompt, get one screen. Generate one image per chat turn, at the stated canvas size, and attach Prompt 05's result as a style reference for later prompts.

**Bangla text warning.** Image models misdraw Bangla conjuncts. The prompts use English labels on purpose. Treat images as layout references, and take Bangla copy from the i18n files, never from an image.

**Expected output for every prompt.** One flat UI screen, no device frame, legible labels, realistic simulated data, and spacing a developer can measure.

### **Prompt 01\. Landing page (desktop)**

Design a flat production UI screenshot, no device frame, 1440 x 2200 px, of the landing page of Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: explain the product in five seconds and start a check.  
Header: 72 px solid bar with a bottom hairline. Left: ring logo of 8 arcs, one yellow, and wordmark "prohori". Centre links: How it works, Safety, For fraud teams. Right: language control "EN", ghost button "Sign in", yellow button "Check a message".  
Hero, 1200 px container, 7 \+ 5 columns: left column has small eyebrow "Before you press send", huge 56 px bold headline "Check before you pay.", one 18 px sentence "Paste a suspicious message and get a clear answer in Bangla or English before your money moves.", yellow button "Check a message" with dark text and an outline button "Check a payment". Right column: one matte brass hurricane lantern with a warm soft light, standing on a dark surface, simple and photographic.  
Section 2: row of three sample chips under the label "Try a simulated sample": Fake wallet staff, Prize SMS, Wrong-number refund.  
Section 3: three equal cards with icons and one line each: Check a message, Check a payment, I already sent money.  
Section 4: four numbered steps in a row: Paste, Compare, Read, Decide.  
Section 5: four plain promise rows: We never ask for your OTP or PIN. Your private details are hidden. A person reviews every report. Prohori can be wrong, and says so.  
Section 6: a flat preview of a fraud team dashboard in a bordered panel.  
Footer: Safety, Privacy, and the line "Prototype. Uses simulated data."  
Spacing: 96 px between sections, left-aligned text, strong grid alignment.  
Responsive note: design so the sections can stack in one column on phones.  
Consistency: same button, card and icon style everywhere.  
Avoid: gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, lorem ipsum, crowded layouts, shields, padlocks, stock photos of people, phone mockups, customer logos, fake statistics, mixed icon styles.

### **Prompt 02\. Login page**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the sign-in page of Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: quick calm sign-in with an obvious way to continue without an account.  
Layout: empty page with one centered 420 px card. Above the card the ring logo and wordmark "prohori".  
Card content top to bottom: 28 px semibold "Sign in"; label "Email" with a 48 px input; label "Password" with a 48 px input and an eye icon on the right; right-aligned link "Forgot password?"; full-width 52 px yellow button with dark text "Sign in"; thin divider; full-width ghost button "Check without an account"; centred line "New here? Create account".  
Spacing: 24 px card padding, 16 px between fields.  
Typography: labels 14 px semibold, body 16 px regular.  
Responsive note: the card becomes full width with 16 px gutters on phones.  
Consistency: identical input style across all forms.  
Avoid: split-screen hero art, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, stock photos, social login buttons, mixed icon styles.

### **Prompt 03\. Registration page**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the create-account page of Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: make clear an account is optional, then collect the minimum.  
Layout: centered 460 px card with the logo above it.  
Card content: 28 px semibold "Create your account"; a one-line note in secondary text "You do not need an account to check a message."; inputs for Name, Email, Password with a small three-segment strength hint under it reading "Good"; a select labelled Language showing English; a checkbox line "I agree to the privacy note"; full-width 52 px yellow button "Create account"; centred line "Already have an account? Sign in".  
Spacing: 24 px padding, 16 px between fields.  
Responsive note: full width on phones.  
Consistency: same inputs and button as the sign-in page.  
Avoid: phone number field, OTP field, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, stock photos, mixed icon styles.

### **Prompt 04\. Onboarding, language step**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of step 1 of onboarding in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: let a first-time user pick a language in one tap.  
Layout: top row with a three-step indicator (first step yellow, others hairline) and a "Skip" link at right. Below, 28 px semibold heading "Choose your language". Two stacked full-width 96 px cards: first card selected with a 2 px yellow border and a deep green fill labelled "Bangla", second card labelled "English". Fixed at the bottom a full-width 52 px yellow button "Next".  
Spacing: 16 px side gutters, 16 px between cards, generous empty space.  
Consistency: one primary button only.  
Avoid: illustrations, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 05\. Main dashboard: Check home (mobile, signed in)**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the home screen of Prohori. This screen sets the visual style for the whole product.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: start a check in one tap. This is not a wallet: show no balance, income or expenses.  
Top bar: ring logo left, language icon right.  
Content: 22 px greeting "Hi Rahim", secondary line "What do you need to check?"  
Two large stacked action cards, each 112 px tall, with a 24 px icon, 18 px semibold title and one-line description: "Check a message" with a chat icon, "Check a payment" with a paper-plane icon. The first card has a deep green fill.  
A full-width row with a 1 px \#FF6B5E border and siren icon: "I already sent money".  
Small heading "Recent checks" followed by three list rows, each with a small risk badge, one-line summary and time: red-tinted badge "High" for "Fake staff asked for PIN", orange-tinted badge "Medium" for "New number, Tk 5,000", slate-tinted badge "Low" for "Delivery message".  
Bottom navigation 64 px with four items: Check (active, yellow marker), History, Alerts, Settings.  
Risk colours: High \#FF6B5E, Medium \#FF9F45, Low \#9DB4C0 on dark tints, each with an icon and word.  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: account balance, spending charts, green for low risk, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 06\. Check home (desktop, signed in)**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the desktop home screen of Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: same one-tap focus as mobile, with a narrow reading column.  
Layout: left sidebar 256 px with logo and items Check (active with 3 px yellow left marker and green fill), History, Alerts, Settings; user name at the bottom. Main area has one centred 640 px column.  
Column content: greeting, two equal side-by-side action cards (Check a message, Check a payment), a full-width row "I already sent money" with a thin red border, a card "This week's common scam: Wrong-number refund" with two lines of text, then Recent checks with three rows and risk badges.  
Risk colours: High \#FF6B5E, Medium \#FF9F45, Low \#9DB4C0, each with icon and word.  
Spacing: 32 px page gutter, 24 px between groups, wide calm margins either side.  
Responsive note: the sidebar becomes bottom navigation on phones.  
Avoid: balance widgets, spending charts, top-right floating panels, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 07\. Check home (guest, first visit)**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Prohori home screen for a guest with no history.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show there is nothing to set up; start immediately.  
Layout: top bar with ring logo, language icon and a quiet "Sign in" link. Heading 28 px "Check before you pay". Two stacked action cards, Check a message and Check a payment. Row "I already sent money" with thin red border. Lower, a small muted line "Sign in to keep your history." No bottom navigation.  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: login walls, popups, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 08\. Message Check, empty**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Message Check input screen in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: one clear job, paste a message.  
Layout: back arrow and title row. 28 px heading "Paste the message". Small info alert with \#7CC0EC icon: "Do not paste your own PIN or OTP." A 200 px tall textarea on \#13211E with placeholder "Paste the SMS or chat here" and a small "Paste" button inside at bottom right. Text link "Try a simulated sample". An accordion row "Add details (optional)" closed.  
Fixed bottom: full-width 52 px disabled button "Check message" on \#1B2D29 with muted text.  
Spacing: 16 px gutters, 16 px between items.  
Consistency: same back arrow and buttons across check screens.  
Avoid: chat-style layout, avatars, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 09\. Message Check, filled and ready**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Message Check screen in Prohori with a message pasted.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show the ready state.  
Layout as the empty screen: back row, heading "Paste the message", info alert, then a textarea containing this realistic simulated text: "Dear customer, your wallet account will be closed today. Share the 6 digit code now to keep it active." Character count "104 / 4000" bottom right. Open accordion "Add details" with a select "Who did it claim to be?" set to Wallet staff.  
Fixed bottom: full-width 52 px yellow button with dark text "Check message".  
Spacing: 16 px gutters.  
Avoid: real brand logos, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 10\. Message Check, validation error**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Message Check screen in Prohori showing a validation error.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: explain the fix calmly.  
Layout: back row, heading "Paste the message". Textarea with a 2 px \#FF6B5E border containing the short text "hello". Directly below, an x-circle icon in \#FF6B5E and text "Paste at least 10 characters so we can check it." Button below stays disabled.  
Spacing: 8 px between field and error.  
Avoid: popups, red full-screen banners, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 11\. Payment Check**

Design a flat production UI screenshot, no device frame, 390 x 1100 px mobile, of the Payment Check form in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: four quick questions on one screen.  
Layout: back row, 28 px heading "Tell us about the payment".  
Field 1 Amount: large 48 px input with a taka prefix showing 25,000.  
Field 2 "Do you know the recipient?": segmented control Known, New (selected, green fill), Not sure.  
Field 3 "Recipient number (optional)": input showing 01712 345678\.  
Field 4 "How did the request reach you?": pill chips Phone call (selected), SMS, WhatsApp or Messenger, In person, Online shop, Other.  
Field 5 "Are you being rushed?": segmented control Yes (selected), No, Not sure.  
Field 6 select "Wallet": Choose provider.  
Fixed bottom: full-width 52 px yellow button "Check payment".  
Spacing: 24 px between fields, labels 14 px semibold above each control.  
Avoid: multi-step wizard, sliders, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 12\. Checking in progress**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Prohori checking screen while a message is analysed.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show calm progress. No percentage.  
Layout: centred column. The ring logo at 64 px with one yellow arc. Heading 22 px "Checking your message". Secondary line "This takes a few seconds." Below, a vertical list of four steps with small status icons: "Hiding private details" done, "Checking known warning signs" done, "Comparing with known scams" active in yellow with a small spinner, "Writing your result" waiting and muted.  
Spacing: 24 px between rows, vertically centred.  
Avoid: percentage bars, robots, brain icons, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 13\. Result: High risk (mobile)**

Design a flat production UI screenshot, no device frame, 390 x 1200 px mobile, of the High risk result screen in Prohori. This is the most important screen in the product.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: stop the payment and give one safe action within the first screenful.  
Layout top to bottom:  
1\. Back link "Check another".  
2\. Risk banner, full width, fill \#3A1714, 1 px border \#FF6B5E: 48 px octagon icon in \#FF6B5E, 28 px bold "High risk", then 18 px "Stop. Do not send money."  
3\. Three-step meter: Low, Medium, High, with High filled \#FF6B5E.  
4\. Heading "Why this looks risky" with three short rows, each with a small icon: "Asks for a secret code. Real staff never do.", "Pressures you to act today.", "Claims to be wallet staff from an unknown number."  
5\. Card "The message" showing masked text with two phrases underlined in \#FF6B5E: "Share the 6 digit code now" and "closed today". A masked number in monospace: \+880 17\*\* \*\*\*678.  
6\. Heading "What to do now" with a card: "Call your wallet's official helpline".  
7\. Quiet action rows: Report this message, Ask someone you trust, Read aloud, I already sent money.  
8\. Small caution: "Prohori can be wrong. Your provider's official helpline is the final check."  
Fixed bottom bar: full-width 52 px button in solid \#F3F1E8 with dark text and a phone icon, "Call helpline".  
No yellow on this screen.  
Spacing: 16 px gutters, 24 px between groups, generous breathing room around the banner.  
Hierarchy: banner, instruction, reasons, then everything else.  
Avoid: skulls, sirens flashing, full red pages, percent scores, yellow accents, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 14\. Result: High risk (desktop)**

Design a flat production UI screenshot, no device frame, 1440 x 1100 px, of the High risk result on desktop in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: same priority as mobile, in a single calm reading column.  
Layout: 256 px sidebar left with Check, History, Alerts, Settings. Centred 640 px column with: banner fill \#3A1714, border \#FF6B5E, octagon icon, "High risk" and "Stop. Do not send money."; three-step meter; "Why this looks risky" with three rows; masked message card with underlined phrases in \#FF6B5E; "What to do now" with an inline \#F3F1E8 button "Call helpline" and outline button "Report this message"; small text links Ask someone you trust, Read aloud, I already sent money; caution line.  
Spacing: 24 px between groups.  
Responsive note: the column is the same content as mobile.  
Avoid: multi-column dashboards, side panels, percent scores, yellow accents, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 15\. Result: Pressure Pause active**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the High risk result in Prohori with the Pressure Pause showing.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: slow a rushed person down for ten seconds without blocking them.  
Layout: the High risk banner stays at the top with fill \#3A1714, octagon icon in \#FF6B5E, "High risk" and "Stop. Do not send money." Directly under it a card on \#1B2D29: a thin circular countdown ring in \#F3F1E8 with the number 7 in the centre, the 20 px line "Take a breath." and secondary line "Scammers want you to rush. Ten seconds changes nothing for a real payment." At the card's bottom right, a quiet text link "Skip". Below the card the first reason row is visible.  
Spacing: 24 px padding, calm and quiet.  
Avoid: locked screens, modal overlays, alarms, yellow accents, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 16\. Result: Medium risk**

Design a flat production UI screenshot, no device frame, 390 x 1000 px mobile, of the Medium risk result in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: make the user verify first.  
Layout: back link; banner fill \#3A2510 and 1 px border \#FF9F45 with a 48 px warning triangle in \#FF9F45, 28 px bold "Medium risk", 18 px "Check before you send."; three-step meter with Medium filled \#FF9F45; heading "What we noticed" with two rows: "This is a new number for you.", "Tk 25,000 is a large amount to send to someone new."; heading "What to do now" with a card "Confirm with the person another way, such as a call to a number you already have."; quiet rows Call helpline, Report this message; caution "Prohori can be wrong."  
Fixed bottom: full-width 52 px \#F3F1E8 button with dark text "I will confirm first".  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: yellow accents, percent scores, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 17\. Result: Low risk**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Low risk result in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: reassure honestly. Low is not safe.  
Layout: back link; banner fill \#1D2A30, 1 px border \#9DB4C0, 48 px info-circle icon in \#9DB4C0, 28 px bold "Low risk", 18 px "We found no common warning signs." Directly under, a line that must be clearly visible: "This does not mean the payment is safe. Confirm the number before you send." Three-step meter with Low filled \#9DB4C0. Heading "What we looked at" with two rows: "No request for a code or PIN.", "No pressure to act fast." Quiet row "Report anyway".  
Fixed bottom: full-width 52 px \#F3F1E8 button with dark text "Check another".  
The screen must contain no green and no checkmarks.  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: green colours, checkmarks, the word safe as a verdict, celebration, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 18\. Result: check unavailable (fallback)**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Prohori fallback screen when the AI check cannot finish.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: stay useful and honest when the service fails.  
Layout: banner fill \#14293A, 1 px border \#7CC0EC, info icon, 24 px "We could not finish this check". Line: "Do not treat this as a pass." Heading "Until you can check" with three rows: "Never share an OTP or PIN.", "Do not send money until you confirm.", "Call your wallet's official helpline."  
Full-width 52 px \#F3F1E8 button "Try again" and an outline button "Call helpline".  
No risk level shown.  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: error codes, broken robot illustrations, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 19\. Result: How Prohori decided**

Design a flat production UI screenshot, no device frame, 390 x 900 px mobile, of the open "How Prohori decided" section on a Prohori result.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show the evidence in plain words.  
Layout: an expanded accordion with title "How Prohori decided". Inside, three labelled rows: "Warning signs found: 3" with chips Secret code, Urgency, Staff claim; "Closest known scam: Fake wallet staff"; "Payment details: New recipient, large amount". Below, a short note "We compare your message with known scam patterns. We cannot see your wallet." A tooltip is open on one highlighted phrase, reading "Real staff never ask for this code."  
Spacing: 16 px padding, 12 px between rows.  
Avoid: model names, code, charts, percent scores, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 20\. Report this message modal**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Report this message bottom sheet in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: honest consent before a report.  
Layout: the result is dimmed behind a 60 percent scrim. A bottom sheet with 16 px top radius: drag handle, 22 px title "Report this message", secondary line "A person will review this. Reporting does not block anyone or get money back." A small card with the masked message preview using \+880 17\*\* \*\*\*678 in monospace. Optional textarea "Add a note". A checkbox "I agree to share this masked message with reviewers" ticked. Full-width 52 px \#F3F1E8 button "Send report". Ghost button "Cancel".  
Spacing: 24 px padding.  
Avoid: unmasked numbers, gradients, glassmorphism, blurred backdrops, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 21\. Report sent confirmation**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the report confirmation in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: confirm and set expectations.  
Layout: bottom sheet with a 32 px check-circle icon in \#4CC38A, 22 px "Report sent", reference in monospace "PRO-000123", secondary line "A reviewer will look at it. You will see updates in Alerts if you are signed in." Button "Done" in \#F3F1E8 with dark text.  
Spacing: 24 px padding, centred content.  
Avoid: confetti, promises of refund, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 22\. Ask someone you trust**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Ask someone you trust sheet in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: let someone share a safe, masked result with a family member.  
Layout: bottom sheet titled "Ask someone you trust". Line: "They see this result with private details hidden. The link stops working in 24 hours." Read-only link field in monospace, shortened, with a copy icon. Two buttons: "Share link" in \#F3F1E8 with dark text and "Stop sharing" as a ghost button. A small card previewing what they will see: a High risk badge and first reason.  
Spacing: 24 px padding.  
Avoid: social media logos, contact lists, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 23\. I already sent money**

Design a flat production UI screenshot, no device frame, 390 x 1000 px mobile, of the emergency screen I already sent money in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: give clear ordered steps to someone panicking.  
Layout: back link. 28 px bold "Act now. Do this first." Four numbered step cards, numbers in large \#F3F1E8. Step 1 is largest, with a provider select showing a wallet and a full-width \#F3F1E8 button with dark text "Call official helpline". Step 2 "Save the transaction ID and screenshots. Do not delete messages." Step 3 "Do not pay anyone who promises to get it back." Step 4 "Report it through official channels." Bottom note in secondary text: "Recovery is not guaranteed. Calling quickly gives the best chance."  
Spacing: 16 px gutters, 12 px between cards.  
Avoid: red full-screen backgrounds, flashing, promises of recovery, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 24\. Check history**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the History screen in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: find a past check quickly.  
Layout: title "History". Horizontal pill filters: All (selected), High, Medium, Low, and a filter icon button. List of six rows on \#13211E cards, each with a small risk badge with icon and word, a one-line summary, scam type in secondary text, a date such as "3 Nov", and a small status "Reported" on some rows. Risk colours High \#FF6B5E, Medium \#FF9F45, Low \#9DB4C0. Text button "Load more". Bottom navigation with History active with a yellow marker.  
Spacing: 16 px gutters, 8 px between rows.  
Avoid: charts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 25\. Check history, empty state**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the empty History screen in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: guide the first action.  
Layout: title "History". Vertically centred: a small simple line drawing of a lantern, 96 px, in \#A9B8B2 with a touch of \#F2C14E; 18 px "No checks yet"; secondary line "Your checks will appear here."; yellow button "Check a message". Bottom navigation.  
Spacing: 16 px between items.  
Avoid: cartoon mascots, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 26\. Check detail**

Design a flat production UI screenshot, no device frame, 390 x 1000 px mobile, of a past check detail in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: review a past result and its report status.  
Layout: back arrow, title "Check details", date "3 Nov 2026, 9:42 PM". Compact banner with risk badge High, fill \#3A1714. Status row: "Report PRO-000123: Reviewer confirmed scam". Reasons list with two rows. Masked message card with underlined phrases in \#FF6B5E. At the bottom a quiet danger text button "Delete this check" in \#FF6B5E.  
Spacing: 16 px gutters, 16 px between groups.  
Avoid: charts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 27\. Verify email**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the verify-email page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: tell the user to click the link in their email. No code entry.  
Layout: centered 420 px card with logo above. 32 px envelope icon, 28 px "Check your email", line "We sent a link to r\*\*\*m@example.com.", outline button "Resend link", small timer line "You can resend in 0:42", link "Use a different email".  
Spacing: 24 px padding, centred text.  
Responsive note: full width on phones.  
Avoid: code entry boxes, OTP fields, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, stock photos, mixed icon styles.

### **Prompt 28\. Forgot password**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the forgot-password page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: start recovery in one step.  
Layout: centered 420 px card with logo above. 28 px "Reset your password", one line "Enter your email and we will send a link.", Email input, full-width 52 px yellow button "Send link", back link "Back to sign in".  
Spacing: 24 px padding, 16 px between items.  
Avoid: security questions, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, stock photos, mixed icon styles.

### **Prompt 29\. Reset password**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the new-password page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: set a new password.  
Layout: centered 420 px card. 28 px "Choose a new password", New password input with eye icon and three-segment strength hint, Confirm password input, helper "Use at least 10 characters.", full-width 52 px yellow button "Save password".  
Spacing: 24 px padding, 16 px between fields.  
Avoid: gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, stock photos, mixed icon styles.

### **Prompt 30\. Onboarding, how to use**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of step 2 of onboarding in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: teach the flow in three steps.  
Layout: step indicator with step 2 yellow, "Skip" link right. 28 px heading "How to use Prohori". Three numbered rows, each with a 40 px deep-green circle holding the number, a bold line and a one-line description: "Copy the message", "Paste it into Prohori", "Read the result before you pay". Fixed bottom: Back as ghost button, Next as yellow button.  
Spacing: 16 px gutters, 24 px between rows.  
Avoid: cartoon people, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 31\. Onboarding, three promises**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of step 3 of onboarding in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: set honest expectations.  
Layout: step indicator with step 3 yellow. 28 px heading "Three promises". Three stacked cards with an icon and one sentence: hand icon "We never ask for your OTP or PIN."; info icon "Prohori can be wrong. It helps you decide."; person icon "You stay in control. We never block a payment." Fixed bottom: full-width 52 px yellow button "Start checking".  
Spacing: 16 px gutters, 12 px between cards.  
Avoid: legal text, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 32\. Shared result**

Design a flat production UI screenshot, no device frame, 390 x 900 px mobile, of the public shared result page in Prohori, seen by a family member.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: let a relative understand and advise quickly.  
Layout: simple header with ring logo. Line "Someone you know asked you to look at this." Banner fill \#3A1714, border \#FF6B5E, octagon icon, "High risk. Stop. Do not send money." Reasons with three rows. Masked message card with \+880 17\*\* \*\*\*678 in monospace. Card "How you can help": "Call them. Ask them not to send money until they reach the official helpline." Footer line "This link expires in 23 hours. Private details are hidden."  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: navigation menus, names, unmasked numbers, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 33\. Shared result, expired**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of an expired shared link page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: end cleanly and offer a check.  
Layout: ring logo, then centred 22 px "This link has expired", secondary line "Shared results stop working after 24 hours.", yellow button "Check a message".  
Spacing: vertically centred, 16 px between items.  
Avoid: error codes, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 34\. Settings, Preferences**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Settings Preferences tab in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: simple personal settings.  
Layout: 256 px sidebar with Settings active. Centred 640 px column. Title "Settings". Underline tabs: Profile, Preferences (active, 2 px yellow underline), Security, Your data. Card with rows, label left, control right: Language (select, Bangla), Theme (segmented System, Dark, Light), Text size (segmented Normal, Large), Read results aloud (switch off). Yellow button "Save changes" bottom right.  
Spacing: 24 px padding, 56 px rows with hairline dividers.  
Responsive note: controls stack under labels on phones.  
Avoid: gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 35\. Settings, Security**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Settings Security tab in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: manage password and sessions.  
Layout: 256 px sidebar, centred 640 px column, tabs with Security active. Card "Change password" with three inputs and an outline button. Card "Active sessions" with two rows, device name, last active time, "This device" badge on one and a "Sign out" link on the other. Outline button "Sign out everywhere". Separate quiet row "Sign out".  
Spacing: 24 px between cards.  
Avoid: 2FA code prompts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 36\. Settings, delete account**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the delete account confirmation modal in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: prevent accidental deletion.  
Layout: Settings Your data tab dimmed behind a scrim. Centered 520 px modal on \#13211E: 22 px "Delete your account?", line "This removes your profile and check history. Masked reports already sent to reviewers stay, without your name.", input labelled "Type DELETE to confirm", buttons Cancel (ghost) and Delete account (solid \#FF6B5E with dark text, disabled until typed).  
Spacing: 24 px padding, buttons right aligned.  
Avoid: gradients, glassmorphism, blurred backdrops, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 37\. Notifications**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Alerts screen in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show updates without noise.  
Layout: title "Alerts", text button "Mark all read". Tabs All (active) and Unread. Rows with a small unread yellow dot, icon, title and time: "Your report PRO-000123 was reviewed", "New common scam: Wrong-number refund", "New sign-in on your account". Bottom navigation with Alerts active.  
Spacing: 64 px rows, hairline dividers.  
Avoid: marketing messages, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 38\. Safety and privacy page**

Design a flat production UI screenshot, no device frame, 1440 x 1500 px, of the Safety and privacy page of Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: earn trust with plain facts.  
Layout: same public header as the landing page. Centred 640 px column. H1 "How Prohori protects you". Info alert "Prototype. Uses simulated data." Sections with short headings and two lines each: What we check; What we never ask for; What happens to your text; What Prohori cannot do; Who reviews reports. Then a list of official helplines in a card, with a note "Always confirm numbers in your provider's official app." Accordion FAQ with three rows, one open.  
Spacing: 40 px between sections, 28 px line height for body.  
Avoid: legal walls, stock photos, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, mixed icon styles.

### **Prompt 39\. Landing page (mobile)**

Design a flat production UI screenshot, no device frame, 390 x 2000 px mobile, of the Prohori landing page.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: start a check within the first screen on a phone.  
Layout: 64 px header with logo, language control, menu icon. 36 px bold headline "Check before you pay.", one sentence, full-width 52 px yellow button "Check a message", full-width outline button "Check a payment". A small matte brass lantern image 240 px wide. Three sample chips. Three stacked action cards. Four numbered steps stacked. Four promise rows. Footer with "Prototype. Uses simulated data."  
Spacing: 16 px gutters, 64 px between sections.  
Avoid: hamburger overlays, device mockups, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, fake statistics, mixed icon styles.

### **Prompt 40\. Reviewer Overview dashboard**

Design a flat production UI screenshot, no device frame, 1440 x 1100 px, of the fraud team Overview dashboard in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons. Risk colours High \#FF6B5E, Medium \#FF9F45, Low \#9DB4C0.  
Objective: read queue pressure and trends in ten seconds.  
Left sidebar 256 px: logo, Overview (active with yellow marker and green fill), Case queue, Repeat numbers, Campaigns, Reports.  
Header row: title "Overview", small badge "Simulated data", segmented date range 7, 30 (active), 90 days, Custom, bell icon, user avatar initial.  
Alert row with a graph icon: "Refund scam reports doubled in 7 days" and link "View campaign".  
Four stat cards in a row, 40 px numbers: Open cases 42, High-risk today 9, Median time to decision 3.2 h, Reviewer agreement 86%.  
Row 2, 8 \+ 4 columns: stacked bar chart "Cases by risk level" over 30 days; horizontal bar chart "Top scam types" with five bars: Fake wallet staff, Fake OTP request, Prize SMS, Wrong-number refund, Fake agent.  
Row 3, 6 \+ 6 columns: line chart "Repeated risky numbers"; stacked bar chart "Reviewer decisions".  
Charts: thin gridlines \#2A3F3A, legends above, axis labels \#A9B8B2, flat fills.  
Spacing: 32 px page gutter, 24 px grid gaps.  
Consistency: real readable values on axes.  
Avoid: 3D charts, donut overload, gradients in charts, glow, glassmorphism, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 41\. Reviewer Overview, loading**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Prohori fraud team Overview in its loading state.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: keep layout stable while data loads.  
Layout: 256 px sidebar and header are fully rendered. Four stat cards and four chart cards show skeleton blocks in \#1B2D29: short bars for titles, large bar for numbers, stacked rectangles for charts. No spinner.  
Spacing: 32 px page gutter, 24 px gaps.  
Avoid: full-page spinners, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 42\. Reviewer Overview, empty**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Prohori fraud team Overview with no data in the selected range.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: explain the empty view and offer a way out.  
Layout: sidebar and header remain, filter chips show "Custom: 1 Jan to 3 Jan" and "Scam type: Prize SMS". Centre of the main area: 32 px funnel icon, 18 px "No cases in this range", secondary line "Try a wider date range or fewer filters.", outline button "Clear filters".  
Spacing: generous, centred.  
Avoid: zero-filled charts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 43\. Case Queue**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Case queue in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons. Risk colours High \#FF6B5E, Medium \#FF9F45, Low \#9DB4C0.  
Objective: work cases in priority order.  
Layout: sidebar with Case queue active. Header "Case queue", badge "Simulated data". Tabs: New 18 (active), In review 12, Decided 204, All. Filter bar: search "Search reference", selects Risk, Scam type, Assignee, Date, and a Clear link.  
Full-width table on \#13211E, 52 px rows, header 40 px with small uppercase labels: Reference (PRO-000123 in monospace), Risk (badge with icon and word), Scam type, Sender (masked \+880 17\*\* \*\*\*678 in monospace), Number reports (count), Age, Assignee, Status. Eight rows of realistic simulated data, High first. One row hovered in \#1B2D29 with button "Assign to me".  
Pagination at bottom right.  
Spacing: 32 px page gutter.  
Avoid: unmasked numbers, card grids, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 44\. Case Queue (mobile)**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Case queue in Prohori on a phone.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: triage on the go.  
Layout: top bar with menu icon and "Case queue". Scrollable tabs New, In review, Decided. Filter icon button. Stacked cards, each with reference in monospace, risk badge at right, scam type, masked number, age and assignee. Three cards visible.  
Spacing: 16 px gutters, 8 px between cards.  
Avoid: horizontal tables, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 45\. Case Detail**

Design a flat production UI screenshot, no device frame, 1440 x 1300 px, of the Case detail page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons. Risk High \#FF6B5E.  
Objective: give one reviewer everything for a defensible decision.  
Layout: sidebar, then 8 \+ 4 columns.  
Header row: back link, reference PRO-000123 in monospace, High risk badge, status "In review", assignee.  
Left column cards: "Reported message" with masked text and two phrases underlined in \#FF6B5E, masked number \+880 17\*\* \*\*\*678 with "14 reports". "Prohori's assessment": final level High, rule hits chips (Asks for code, Urgency), AI level High, payment score 0.82, three short reasons. "Evidence": two matched scam pattern titles with IDs. "Trace" as a compact key-value list: Prompt version v3, Model Sonnet, Route Full analysis, Patterns PAT-014, PAT-022, Latency 3.4 s. "Similar cases": two small rows.  
Right column: sticky "Your decision" card with four radio options Confirmed scam, Not a scam, Needs escalation, Close without action; select Scam type; required textarea "Reason"; yellow button "Record decision". Below, "Notes" with an input and two notes. Below, "Timeline" with four events.  
Footer of decision card: small line "This does not block anyone."  
Spacing: 24 px gaps.  
Avoid: unmasked numbers, chat bubbles, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 46\. Case decision confirmation**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the decision confirmation modal in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: confirm a human decision.  
Layout: Case detail dimmed behind a scrim. Centered 520 px modal: 22 px "Record this decision?", key-value rows Decision: Confirmed scam, Scam type: Fake wallet staff, Reason: first line shown. Line "This updates the case and the number's status. It does not block anyone." Buttons Cancel (ghost), Record decision (yellow).  
Spacing: 24 px padding.  
Avoid: gradients, glassmorphism, blurred backdrops, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 47\. Case conflict state**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Case detail page in Prohori when another reviewer changed the case.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: resolve a conflict without losing work.  
Layout: same two-column Case detail. In the right column above the decision form, an orange inline alert with fill \#3A2510 and border \#FF9F45: "Farhan changed this case 1 minute ago. Reload to see the latest. Your reason text is kept." Button "Reload case". Record decision button disabled.  
Spacing: 24 px gaps.  
Avoid: popups, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 48\. Repeat Numbers**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Repeat numbers page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: find numbers behind many reports.  
Layout: sidebar, header with "Simulated data" badge. Filters: Status, Date, Minimum reports. Table with masked numbers in monospace, Reports, Checks, High share, First seen, Last seen, Status badge (Watch, Confirmed risky, Cleared). One row selected. Right drawer 400 px wide: masked number, 30-day line chart of reports with one flat \#FF6B5E line, linked cases list, select to change status, required reason input, yellow button "Save status".  
Spacing: 32 px page gutter.  
Avoid: unmasked numbers, maps, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 49\. Scam Campaigns**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Scam campaigns page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: see near-identical messages as one campaign.  
Layout: sidebar, header. Three-column card grid, six cards. Each card: campaign label such as "Refund request, 01 7 series", scam type badge, large message count, change "+96% in 7 days", last seen, small flat sparkline. One card highlighted with a 2 px yellow border and label "Growing fast". Top note: "Groups are suggestions. A reviewer confirms them."  
Spacing: 24 px gaps.  
Avoid: network graphs, node diagrams, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 50\. Reports and Export**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Reports page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: export reviewed cases as CSV.  
Layout: sidebar, header. Left card 480 px "Export reviewed cases": date range, Status select, Scam type select, helper "Exports are masked and logged.", yellow button with a download icon "Export CSV". Right table "Recent exports": Date, By, Range, Rows, Download link.  
Spacing: 24 px gaps.  
Avoid: charts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 51\. Admin Knowledge Base**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Knowledge base admin page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: manage scam-pattern documents used as evidence.  
Layout: sidebar with reviewer items plus an Admin group where Knowledge base is active. Header with yellow button "Add pattern". Filters: Scam type, Language, Status. Table: Title, Scam type, Language (Bangla, English, Banglish), Chunks, Status (Published, Draft), Updated. Eight rows of plausible scam-pattern titles.  
Spacing: 32 px page gutter.  
Avoid: code editors, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 52\. Admin Safe Actions**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Safe actions admin page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: control the only next steps the AI may suggest.  
Layout: sidebar with Safe actions active. Top info alert: "The AI can only choose from this list. It cannot write a new number." Table: ID in monospace, Action, Minimum level, Provider, Verified on, Source link, Active switch. Six rows. One row shows an orange warning chip "Re-verify".  
Spacing: 32 px page gutter.  
Avoid: real phone numbers, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 53\. Admin Quality**

Design a flat production UI screenshot, no device frame, 1440 x 1100 px, of the Quality admin page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show evaluation and cost honestly.  
Layout: sidebar. Header "Quality" with visible note "Measured on simulated data only". Four stat cards: High precision, High recall, Genuine flagged High, Unsafe flags 0\. Table "Evaluation runs": Prompt version, Dataset, Precision, Recall, Unsafe flags, Date, Status, button "Activate" on one row. Two charts: stacked bar "How checks were answered" (Rules only, Haiku, Sonnet, Fallback) and line "Prompt cache hit rate".  
Spacing: 24 px gaps.  
Avoid: invented accuracy claims, 3D charts, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 54\. Admin Users, invite reviewer**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Users admin page in Prohori with the invite modal open.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: invite a reviewer with least privilege.  
Layout: table of users dimmed behind a scrim: Name, Email, Role, Status, Last active. Centered 520 px modal: "Invite a reviewer", Email input, Role select (Reviewer selected, Admin), helper "The link works once and expires in 48 hours.", buttons Cancel and Send invite (yellow).  
Spacing: 24 px padding.  
Avoid: gradients, glassmorphism, blurred backdrops, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 55\. Admin API Keys**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the API keys admin page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: manage partner access.  
Layout: sidebar. Header with yellow button "Create key" and link "API docs". Table: Name, Prefix in monospace (prh\_test\_ab12), Scopes as chips (checks:write, cases:read), Rate limit, Last used, Revoke link in \#FF6B5E. Four rows.  
Spacing: 32 px page gutter.  
Avoid: full keys on screen, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 56\. API key created**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the key-created modal in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: show a secret once.  
Layout: centered 520 px modal. "Your new API key". Orange inline alert with fill \#3A2510: "Copy it now. You will not see it again." A monospace field showing prh\_test\_ab12 followed by dots and a copy icon. Yellow button "I saved it".  
Spacing: 24 px padding.  
Avoid: gradients, glassmorphism, blurred backdrops, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 57\. Admin Audit Log**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the Audit log page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: trace every action.  
Layout: sidebar. Filters: Actor, Action, Date. Dense 40 px table: Time, Actor, Role, Action (monospace, such as case.decision), Object, Details link. One row selected, with a right drawer showing before and after values side by side in monospace.  
Spacing: 32 px page gutter.  
Avoid: edit buttons, delete buttons, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 58\. Error page**

Design a flat production UI screenshot, no device frame, 1440 x 1024 px, of the 404 error page in Prohori.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: recover quickly. The same template serves 403 and 500\.  
Layout: logo top left. Centred: small "404" in monospace, 28 px "We could not find this page", secondary line "If you were about to pay, stop and check first.", yellow button "Check a message", ghost button "Go home".  
Spacing: centred, 16 px between items.  
Avoid: jokes, broken robots, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, laptop mockups, mixed icon styles.

### **Prompt 59\. Offline and rate-limited**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Prohori rate-limited state.  
Brand system: Prohori, a calm Bangla-first scam checker. Dark UI. Page \#0C1614, cards \#13211E, raised panels \#1B2D29, hairline borders \#2A3F3A, main text \#F3F1E8, secondary text \#A9B8B2, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, no shadows, thin Phosphor outline icons.  
Objective: stay helpful when checks are paused. The same layout covers offline, with the line "You are offline."  
Layout: info banner fill \#14293A, border \#7CC0EC: "Too many checks. Try again in 2 minutes." Card "Until then" with three rows: Never share an OTP or PIN. Do not send money until you confirm. Call your wallet's official helpline. Below, a list of wallet names, each with a phone icon button. Your pasted text remains in a collapsed row "Your message is saved here."  
Spacing: 16 px gutters, 16 px between groups.  
Avoid: error codes, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 60\. Light theme: High risk result**

Design a flat production UI screenshot, no device frame, 390 x 1000 px mobile, of the High risk result in Prohori in light theme.  
Brand system: Prohori, a calm Bangla-first scam checker. Light UI. Page \#F7F5EE warm paper, cards \#FFFFFF, raised panels \#F0EEE5, hairline borders \#D9DDD3, main text \#10201C, secondary text \#4C5F58, deep green \#1F4D43. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, thin Phosphor outline icons.  
Objective: same hierarchy, readable in bright sunlight.  
Layout: back link; banner fill \#FBEBE9, border \#C4291F, 48 px octagon icon in \#C4291F, 28 px bold "High risk", 18 px "Stop. Do not send money."; three-step meter with High filled \#C4291F; "Why this looks risky" with three rows; masked message card with phrases underlined in \#C4291F; "What to do now" card; caution line.  
Fixed bottom: full-width 52 px button in \#10201C with white text "Call helpline".  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: yellow accents, percent scores, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

### **Prompt 61\. Light theme: Check home**

Design a flat production UI screenshot, no device frame, 390 x 844 px mobile, of the Prohori home screen in light theme.  
Brand system: Prohori, a calm Bangla-first scam checker. Light UI. Page \#F7F5EE warm paper, cards \#FFFFFF, raised panels \#F0EEE5, hairline borders \#D9DDD3, main text \#10201C, secondary text \#4C5F58, deep green \#1F4D43, single accent yellow \#F2C14E. Typeface Hanken Grotesk, sentence case. 8 px spacing grid, radius 8 on controls and 12 on cards, flat fills, thin Phosphor outline icons.  
Objective: confirm the system holds in light mode.  
Layout: top bar with ring logo, language icon. Greeting "Hi Rahim". First action card "Check a message" filled \#1F4D43 with \#F3F1E8 text. Second card "Check a payment" white with hairline border. Row "I already sent money" with thin \#C4291F border. Recent checks with three rows and risk badges: High \#C4291F on \#FBEBE9, Medium \#A85400 on \#FBEFE2, Low \#3F5E6E on \#E9EFF2. Bottom navigation with Check active and a yellow marker.  
Spacing: 16 px gutters, 24 px between groups.  
Avoid: account balances, green for low risk, gradients, glassmorphism, neon glow, floating shapes, blue-purple colours, illegible or invented text, shields, padlocks, phone mockup frames, mixed icon styles.

## **11\. 3D assets and illustrations**

Prohori needs six small assets and no mascot. A mascot could soften a warning at the wrong moment, so it is rejected. The one 3D-style object is the lantern, because it carries the brand idea. Nothing decorative appears on risk screens.

| ID | Asset | Placement | Size, background |
| :---- | :---- | :---- | :---- |
| A1 | Hero lantern | S01 hero, right column | 1:1, 1600 px, transparent or \#0C1614 |
| A2 | Empty-state lantern line art | S19, S25, S28 | 1:1, 400 px, transparent |
| A3 | Message-in-hand line art | S08 step 2 | 4:3, 800 px, transparent |
| A4 | Quiet check spot illustration | S09 weekly tip | 3:2, 600 px, transparent |
| A5 | Masking illustration | S02, What happens to your text | 3:2, 900 px, transparent |
| A6 | Reviewer desk spot illustration | S01, For fraud teams | 16:9, 1200 px, \#13211E |

Image tools often fake transparency. After generating, remove the background and inspect the edges.

**Prompt A1. Tool: ChatGPT image generation.** Purpose: hero object.

Create a single photoreal 3D render of a traditional Bengali hurricane lantern (a kerosene hariken lamp) in matte aged brass with a clear glass chimney, on a plain \#0C1614 background. Purpose: hero image for a calm Bangla-first scam protection brand called Prohori, a night watchman concept. Composition: lantern centred, three-quarter front view, occupying 70 percent of the height, a square 1:1 frame with empty space around it. Lighting: the only warm light comes from a small steady flame inside the glass, colour close to \#F2C14E, softly lighting the brass and a faint pool on a dark matte surface below; a very low cool fill from the left in deep green \#1F4D43. Material: matte, believable, slightly worn. Mood: quiet, watchful, trustworthy. Output suitable for background removal.  
Negative: no people, no hands, no text, no logos, no shields, no padlocks, no coins, no glass cards, no neon glow, no lens flare, no blue or purple light, no smoke, no floating particles, no ornate decoration.  
**Prompt A2. Tool: ChatGPT image generation.** Purpose: empty states.

A minimal single-weight line drawing of a hurricane lantern, stroke colour \#A9B8B2, 3 px uniform rounded stroke, with one small flame shape filled \#F2C14E, centred on a plain \#0C1614 background, 1:1 square. Style matches Phosphor outline icons: geometric, simple, friendly, no shading. Purpose: empty-state illustration for a calm security product. Negative: no text, no fills other than the flame, no gradients, no shadows, no background shapes, no faces, no sparkles.  
**Prompt A3. Tool: ChatGPT image generation.** Purpose: onboarding.

A minimal line drawing of a hand holding a simple smartphone with a single message bubble on its screen, stroke colour \#A9B8B2, 3 px uniform rounded stroke, the message bubble outlined in \#F2C14E, on a plain \#0C1614 background, 4:3 landscape, centred with generous margins. Style matches Phosphor outline icons. The hand has no skin colour and no details, only an outline. Negative: no text in the bubble, no gradients, no shadows, no faces, no logos, no decorative shapes.  
**Prompt A4. Tool: ChatGPT image generation.** Purpose: weekly tip card.

A minimal line drawing of an open envelope with a small warning triangle rising from it, stroke colour \#A9B8B2, 3 px uniform rounded stroke, triangle stroke \#FF9F45, plain \#13211E background, 3:2 landscape, centred. Phosphor outline style. Purpose: small illustration for a common scam tip. Negative: no text, no fill, no gradients, no shadows, no skull, no faces, no decorative shapes.  
**Prompt A5. Tool: ChatGPT image generation.** Purpose: explain masking.

A simple flat diagram-style illustration showing a message card on the left with three lines of text bars, an arrow, and the same card on the right with parts of the bars covered by solid rounded blocks, showing private details hidden. Colours: card fill \#13211E, bars \#A9B8B2, covering blocks \#1F4D43, arrow \#F2C14E, background \#0C1614. 3:2 landscape, centred, generous margins. No real text or numbers. Negative: no padlocks, no shields, no eyes, no people, no gradients, no shadows, no glow.  
**Prompt A6. Tool: ChatGPT image generation.** Purpose: For fraud teams section.

A minimal flat front-view illustration of a tidy desk with a laptop showing a simple table of rows and a notebook beside it, drawn in line art with stroke \#A9B8B2, 3 px uniform stroke, one highlighted table row in \#F2C14E, background \#13211E, 16:9 landscape. Calm, professional. Negative: no people, no faces, no text, no logos, no holograms, no gradients, no glow, no floating elements.

## **12\. Design do's and don'ts**

| Do | Don't |
| :---- | :---- |
| Put the level and action first | Bury the instruction under explanation |
| Pair every risk color with a word and icon | Use color alone |
| Show Low risk in slate with a caution | Show green, checkmarks or "safe" |
| Keep masked values in mono type | Show any unmasked number |
| Use Bangla as the design language, then check English | Design in English and bolt Bangla on |
| Use flat surfaces and 1 px borders | Use glassmorphism, glow or gradient fills |
| Use one Lantern action per view | Scatter yellow across a screen |
| Say "Prototype. Uses simulated data." | Show invented customers, logos or accuracy |
| Link only verified helplines from the safe-action list | Type a helpline into a design or copy deck |
| Leave empty space around the result | Add decorative shapes or floating elements |
| Keep charts to five categories | Use 3D charts or rainbow palettes |
| Test at 360 px, 200% text size and in sunlight | Review only on a large dark monitor |

