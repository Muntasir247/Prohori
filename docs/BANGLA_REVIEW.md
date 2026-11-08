# Prohori — Bangla Language & Translation Review

> **Purpose:** Document all critical Bengali translations, idioms, disclaimers, and user guidance across Prohori that require native human linguistic and cultural sign-off prior to production deployment.
> 
> *Non-negotiable Principle:* Avoid "translation by machine alone". Fraud prevention copy in Bangladesh must be unambiguous, direct, respectful, and easily comprehensible to users of varying literacy and technical familiarity.

---

## 1. Mandatory Safety Disclaimers & Core Safeguards

These strings represent core system guardrails. Any ambiguity or mistranslation could lead a user into false reassurance.

| Key / Screen | English (Source) | Bengali (In-Use) | Why Human Review Is Required | Review Sign-off Status |
| :--- | :--- | :--- | :--- | :--- |
| `result.mandatory_low_caution` (S15) | *"Low risk does not mean 100% safe — always stay vigilant."* | **"কম ঝুঁকির অর্থ শতভাগ নিরাপদ নয় — সচেতন থাকুন।"** | Critical safety disclaimer. Must convey that automated checks cannot guarantee complete safety without sounding overly alarmist. | Needs Native Reader Review |
| `result.final_caution_line` (S13, S14, S15) | *"Never share your PIN, OTP, or password with anyone."* | **"কখনো কাউকে আপনার পিন (PIN), ওটিপি (OTP) বা পাসওয়ার্ড দেবেন না।"** | English acronyms (PIN, OTP) placed alongside Bengali script for maximum recognition on feature phones and SMS. | Needs Native Reader Review |
| `pause.message` (S13, F32) | *"Take a breath. Scammers want you to rush."* | **"এক মুহূর্ত থামুন। প্রতারকরা আপনাকে তাড়াহুড়ো করাতে চায়।"** | Calm, psychological de-escalation tone. Assesses whether "এক মুহূর্ত থামুন" or "একটু সময় নিন" is more natural across rural and urban demographics. | Needs Native Reader Review |
| `result.unavailable_title` & `subtitle` (S16) | *"Result Unavailable — Automated analysis could not be completed. Do not send money without independent verification."* | **"ফলাফল নির্ধারণ করা সম্ভব হয়নি — কারিগরি ত্রুটির কারণে স্বয়ংক্রিয় বিশ্লেষণ সম্ভব হয়নি। নিজে নিশ্চিত না হয়ে টাকা পাঠাবেন না।"** | Failsafe rule: must prevent the user from assuming the transaction is safe when AI or network fails. | Needs Native Reader Review |
| `message_check.pin_warning` (S10) | *"Do not enter your PIN or OTP here. Prohori will never ask for them."* | **"এখানে আপনার পিন (PIN) বা ওটিপি (OTP) লিখবেন না। প্রহরী কখনো এগুলো জানতে চাইবে না।"** | Input field warning preventing accidental credential submission by victims. | Needs Native Reader Review |

---

## 2. Emergency "Already Sent Money" Guidance (S18)

| Key / Context | English | Bengali | Linguistic & Cultural Context |
| :--- | :--- | :--- | :--- |
| `already_sent.honest_line` | *"Recovery is not guaranteed. Calling quickly gives the best chance."* | **"টাকা ফেরত পাওয়ার নিশ্চয়তা নেই। তবে দ্রুত ফোন করলে সুযোগ সবচেয়ে বেশি।"** | Must balance honesty (not giving false promises of recovery) with motivating immediate action before the scammer cashes out at an agent point. |
| `already_sent.step1_title` | *"Call your mobile financial service helpline immediately"* | **"অবিলম্বে আপনার এমএফএস বা ব্যাংকের হেল্পলাইনে কল করুন"** | Terminology review: "এমএফএস" (Mobile Financial Service) vs "বিকাশ/নগদ কাস্টমার কেয়ার". |
| `already_sent.step2_title` | *"Do not delete messages or call logs; save transaction ID"* | **"এসএমএস বা কল লগ মুছে ফেলবেন না; ট্রানজেকশন আইডি (TrxID) সংরক্ষণ করুন"** | Clarifies that TrxID is required by customer support for freezing the recipient wallet. |
| `already_sent.step3_title` | *"Beware of recovery scammers asking for advance fees"* | **"টাকা উদ্ধারের নামে নতুন প্রতারক চক্র থেকে সাবধান থাকুন (অগ্রিম ফি দেবেন না)"** | Protects secondary victims from advance-fee recovery traps. |

---

## 3. Fraud Anatomy & Risk Explanations (S13, S14)

| Signal / Reason | English | Bengali | Nuance / Dialect Consideration |
| :--- | :--- | :--- | :--- |
| Credential Theft Flag | *"The message explicitly requests your secret PIN or verification code"* | **"বার্তায় সরাসরি আপনার গোপন পিন বা যাচাইকরণ কোড (OTP) চাওয়া হয়েছে"** | Distinguishing between "গোপন পিন" and bank reference numbers. |
| Impersonation Flag | *"Claims to be from an official provider, but sent from an unofficial personal mobile number"* | **"অফিসিয়াল প্রতিষ্ঠান দাবি করলেও ব্যক্তিগত মোবাইল নম্বর থেকে পাঠানো হয়েছে"** | MFS providers in Bangladesh send via alphanumeric Masking IDs (e.g., `bKash`), never personal 11-digit numbers. |
| Fake Prize / Lottery | *"Unsolicited lottery winnings or cashback asking for advance processing fee"* | **"অনুরোধ ছাড়া লটারি বা ক্যাশব্যাকের প্রস্তাব দিয়ে অগ্রিম প্রক্রিয়াকরণ ফি দাবি করা হয়েছে"** | Captures common "বিকাশ প্রতিষ্ঠাবার্ষিকী পুরস্কার" and "লটারি" scams. |
| Wrong Number Refund Story | *"Claiming money was sent by mistake and demanding immediate refund without checking balance"* | **"ভুলে টাকা পাঠানো হয়েছে দাবি করে ব্যালেন্স যাচাই না করেই ফেরত চাওয়া হচ্ছে"** | The classic "ভুল করে টাকা গেছে" scam trick. |

---

## 4. Reviewer Workbench & Administrative Tone (S24, S26, S30–S35)

| Key / Screen | English | Bengali | Terminology Check |
| :--- | :--- | :--- | :--- |
| `case.decision_confirmed_scam` | *"Confirmed Scam"* | **"প্রতারণা নিশ্চিত"** | Clear legal and operational distinction from mere suspicion. |
| `case.decision_not_scam` | *"Not a Scam"* | **"প্রতারণা নয়"** | Confirms normal legitimate transactions. |
| `case.decision_escalate` | *"Needs Escalation"* | **"উর্ধ্বতন তদন্ত প্রয়োজন"** | Signals multi-victim or organized syndicate investigation. |
| `case.version_conflict` | *"This case was updated by another reviewer. Please reload to see the latest changes (your reason was kept)."* | **"এই কেসটি অন্য একজন পর্যালোচক ইতিমধ্যে পরিবর্তন করেছেন। সর্বশেষ দেখতে রিলোড করুন (আপনার নোট অপরিবর্তিত রাখা হয়েছে)।"** | Concurrency conflict explanation ensuring reviewers do not re-type notes. |
| `admin.safe_actions_90d_warning` | *"Warning: Helpline not re-verified in over 90 days."* | **"সতর্কতা: ৯০ দিনের বেশি সময় ধরে এই হেল্পলাইনটি পুনঃযাচাই করা হয়নি।"** | Operational safety trigger preventing stale telephone numbers. |

---

## 5. Verification Checklist for Native Bangla Reviewers

1. [ ] **Clarity of Cautions:** Do older readers and rural mobile users immediately understand that "কম ঝুঁকি" (Low Risk) does not mean safe?
2. [ ] **Banglish & Colloquialisms:** Are instructions natural and free of robotic literal translations (e.g. evitando awkward phrasing like "চাপ বিরতি" for Pressure Pause)?
3. [ ] **Provider Terminology:** Are terms for bKash, Nagad, Rocket, cash-in, cash-out, send money, and merchant payment aligned with actual user mental models in Bangladesh?
4. [ ] **Tone & Empathy:** Does the app maintain an empathetic, non-judgmental tone toward victims who have already lost money?

