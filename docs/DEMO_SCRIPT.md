# Prohori Demo Video Script (3 Minutes / 180 Seconds)

A shot-by-shot production script for the 3-minute hackathon submission video. Demonstrates the complete end-to-end loop: victim scam check -> Scam Anatomy & Pressure Pause -> victim report -> human reviewer decision -> live dashboard update -> closed-loop repeat number rule -> resilient staging fallback -> prototype honesty.

---

## Technical Specifications
- **Total Duration:** 3:00 (180 seconds).
- **Audio:** Calm, clear voiceover narration; subtle ambient keyboard/click Foley; no loud or alarmist background music.
- **Visuals:** Split screen / screencast switching between mobile phone view (390x844 px portrait, Chrome) and desktop reviewer workbench (1440x900 px, Night Watch theme).

---

## Timing Breakdown

```
0:00 ─── [Scene 1: Bangla Scam Check & Pressure Pause] ─── 0:35
0:35 ─── [Scene 2: Reporting & Verified Helplines]   ─── 1:00
1:00 ─── [Scene 3: Reviewer Workbench & Human Decision] ─── 1:40
1:40 ─── [Scene 4: Live Dashboard & Repeat Number Loop] ─── 2:05
2:05 ─── [Scene 5: Kill-Key Resilience & Safe Fallback] ─── 2:35
2:35 ─── [Scene 6: Prototype Honesty & Closing]        ─── 3:00
```

---

## Detailed Script & Storyboard

### Scene 1: The Pressured Victim & Bangla Message Check (0:00 – 0:35)
**Screen:** Mobile View (390 px) — Bangla Language Mode (`bn`).
**Visual:**
- A simulated SMS inbox notification appears on screen:
  *"জরুরি নোটিশ: আপনার বিকাশ একাউন্ট অনিয়মের কারণে বন্ধ করা হয়েছে। সচল রাখতে পিন এবং ওটিপি ১২৩৪ দিন: 01712345678"*
- The victim opens the Prohori mobile web app (`/check/message`).
- User pastes the SMS text into the input field. The 10–4,000 character counter validates.
- User taps the prominent primary button **"যাচাই করুন" (Check Message)**.
- Checking screen (S12) renders an animated pipeline: *নর্মালাইজেশন → পিআইআই মাস্কিং → রুল ইঞ্জিন → ক্লাউড অ্যানালিসিস*.
- Instant transition to **Result High (S13)** with bold red octagon badge.
- **Scam Anatomy:** The message displays with an interactive underlined phrase: *"পিন এবং ওটিপি ১২৩৪ দিন"*. Tapping it reveals the anatomical popover: *"প্রতারণামূলক পিন বা ওটিপি চাওয়ার কৌশল (Credential Harvesting)"*.
- **Pressure Pause:** Top calm banner triggers a 10-second countdown with progress indicator:
  *"এক মুহূর্ত থামুন। প্রতারকরা আপনাকে তাড়াহুড়ো করাতে চায়।"* (Take a breath. Scammers want you to rush.)

**Voiceover (Narration):**
> "In Bangladesh, mobile money fraud succeeds in seconds. Scammers create artificial panic, pretending your account is blocked and rushing you to share a PIN.
> Prohori stands between the victim and that irreversible payment.
> The victim pastes the Bangla message. Prohori masks the phone number, checks deterministic safety rules, and analyzes the text.
> Before any explanation, Prohori presents a High-risk verdict and activates the Pressure Pause—a 10-second breathing space designed to break psychological manipulation."

---

### Scene 2: Reporting the Fraud & Safe Actions (0:35 – 1:00)
**Screen:** Mobile View (390 px).
**Visual:**
- As the Pressure Pause finishes, the Next Safe Step is displayed:
  - Verified bKash helpline card: `16247` with direct `tel:16247` call action.
- User taps **"এই মেসেজটি রিপোর্ট করুন" (Report this message)**.
- The Report Bottom Sheet (S17) slides up.
- The user sees the masked preview (`+880 17** ***678`), enters an optional note: *"They claimed my wallet was locked"*, and checks the mandatory consent checkbox.
- User taps **"রিপোর্ট জমা দিন" (Submit Report)**.
- Confirmation screen generates the tracking reference: **`PRO-849102`**.

**Voiceover (Narration):**
> "Prohori never gives vague advice. Next steps come only from verified safe actions—like the official 16247 helpline.
> With one tap, the victim reports the scam. The report is encrypted, numbers are hashed with keyed HMAC, and tracking ID PRO-849102 is issued.
> But in Prohori, AI never blocks anyone. Every enforcement action requires a human in the loop."

---

### Scene 3: Reviewer Workbench & The Human Decision (1:00 – 1:40)
**Screen:** Desktop View (1440 px) — Night Watch Dark Theme.
**Visual:**
- Switch to Fraud Reviewer Nadia's screen at `/review/cases`.
- Nadia opens the **Case Queue (S25)**. New case `PRO-849102` appears at the top with status badge `New`.
- She clicks into **Case Detail (S26)**.
- Left rail displays the PII-masked message, risk score (0.94), model reasoning, and repeat history showing `01712•••••78` has been reported across 3 distinct checks this week.
- Right rail displays the Decision Form:
  - Decision radio: Nadia selects **"Confirmed Scam"** (`confirmed_scam`).
  - Scam Category: Selects **"Fake Bank/Wallet Staff"**.
  - Audit Reason: Types *"Impersonation of official MFS support soliciting account credentials"*.
  - Version-checked optimistic concurrency protects the record.
- Nadia clicks **"Confirm Decision"**. Modal confirms; case status updates to `Confirmed Scam`.

**Voiceover (Narration):**
> "On the provider workbench, fraud reviewers triage reported cases.
> Reviewer Nadia inspects case PRO-849102. Full numbers and raw credentials are never visible—only secure HMAC hashes and masked displays.
> Seeing this number has targeted multiple citizens today, Nadia confirms the scam and records the mandatory audit rationale.
> Her human decision instantly triggers system-wide protection."

---

### Scene 4: Dashboard Impact & Closed-Loop Repeat Number Rule (1:40 – 2:05)
**Screen:** Desktop View (`/review`) -> Mobile View (`/check/payment`).
**Visual:**
- Reviewer switches to **Overview Dashboard (S24)**.
- Live KPI cards refresh via background polling:
  - *High Risk Today* increments by 1.
  - *Open Cases* decrements.
  - *Cases by Risk Level* chart updates.
- **The Closed Loop:** Cut back to a mobile user opening Payment Check (`/check/payment`).
- The user enters Tk 5,000 to send to `01712345678`.
- Clicks "Check Payment".
- **Result:** Instant **High Risk** verdict with reason:
  *"পূর্বে প্রতারণায় ব্যবহৃত নিশ্চিত নম্বর (Confirmed fraudulent number previously reported and verified)"*.
- The check never even needed the LLM—it triggered the deterministic hard rule `HARD_CONFIRMED_RISKY_NUMBER`.

**Voiceover (Narration):**
> "The review dashboard updates live.
> Minutes later, another citizen is asked to send money to that same phone number.
> Because Nadia confirmed it, Prohori's deterministic rule engine triggers immediately: hard floor High.
> One person's report, verified by a human, shields the next victim automatically."

---

### Scene 5: Fault Tolerance & Safe Fallback (Staging Kill-Key Test) (2:05 – 2:35)
**Screen:** Split Screen: Staging Terminal + Staging Mobile Browser (`staging.prohori.app`).
**Visual:**
- In the terminal, show the staging environment variable being unset:
  `export ANTHROPIC_API_KEY="" && uvicorn app.main:app`
- In the staging browser, a user submits a novel, ambiguous message with zero rule hits:
  *"কালকে দেখা করে টাকাটা দিয়ে দিস"* (Meet tomorrow and give the money).
- The system attempts LLM analysis, catches the simulated API failure, and triggers safe fallback.
- **Screen:** Lands on **Result Unavailable (S16)**.
  - Banner: *"আমরা এই মুহূর্তে মেসেজটি যাচাই করতে পারছি না" (We could not complete this check).*
  - It displays verified emergency hotlines.
  - **Crucial Rule Display:** The screen **never says Low, never claims safe, and never shows green.**

**Voiceover (Narration):**
> "Safety systems must survive failure.
> On our staging copy, we simulate an external AI outage by disabling the model key.
> A user submits an ambiguous message. The pipeline catches the error and falls back gracefully.
> It never crashes, and strictly enforces Non-negotiable Rule #5: Failures fail safe. Unavailable never displays Low, and Low is never green. When in doubt, Prohori protects."

---

### Scene 6: Prototype Honesty & Transparent Limitations (2:35 – 3:00)
**Screen:** Mobile Landing Page Footer & About Screen (`/already-sent`).
**Visual:**
- Camera pans to the prominent footer notice across all screens:
  *"প্রোটোটাইপ • পরীক্ষামূলক কাল্পনিক তথ্যে চালিত (Prototype • Uses simulated data only)"*.
- Opens `/already-sent` (Feature F34: Already Sent Money):
  *"টাকা ফেরত পাওয়ার নিশ্চয়তা নেই। দ্রুত পদক্ষেপ নিন।" (Recovery is not guaranteed. Act immediately.)*
- Display WCAG 2.2 AA accessibility score, keyboard focus rings, and responsive 360 px view.
- Final Title Card:
  - **Prohori (প্রহরী) — Check before you pay.**
  - Team Sudo Sapiens | FinSphere AI: FraudShield Challenge.
  - GitHub & Live Demo links.

**Voiceover (Narration):**
> "Prohori is grounded in prototype honesty.
> All numbers, cases, and logs shown are 100% simulated—no real victims or private numbers are ever stored.
> Prohori connects to no real wallet and never promises money recovery after a scam.
> It gives ordinary people a calm voice, verified guidance, and a moment to pause—before the money is gone.
> Prohori: The night watchman for Bangladesh's mobile money."

---

## Filming & Demo Checklist
- [ ] Staging copy prepared with toggleable `ANTHROPIC_API_KEY` for the kill-key scene.
- [ ] Reviewer account seeded with `reviewer@prohori.test`.
- [ ] Seed data loaded (`simulated-v1`) so dashboard charts render populated histories.
- [ ] Screen recorded at 60 FPS in 1080p.
- [ ] Audio normalized to -14 LUFS with crisp voiceover track.
- [ ] No real telephone numbers, passwords, or API keys exposed on any frame.

