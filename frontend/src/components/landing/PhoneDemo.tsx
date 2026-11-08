import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";

// Hero visual: a real, working mini-version of the check flow inside a phone.
// Message arrives, Prohori checks it (the Eighth Watch ring lights up step by
// step), then the result sheet slides up. Motion tells the product story;
// with prefers-reduced-motion it jumps straight to the result and stops.

export interface DemoScenario {
  id: string;
  tab: { bn: string; en: string };
  sender: string;
  channel: "sms" | "whatsapp";
  text: { bn: string; en: string };
  flagged: { bn: string[]; en: string[] };
  risk: "High" | "Low";
  title: { bn: string; en: string };
  action: { bn: string; en: string };
  reasons: { bn: string[]; en: string[] };
  cta: { bn: string; en: string };
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "cashback",
    tab: { bn: "ক্যাশব্যাক প্রলোভন", en: "Cashback lure" },
    sender: "bKash-Offer",
    channel: "sms",
    text: {
      bn: "অভিনন্দন! আপনি ৫,০০০ টাকা ক্যাশব্যাক জিতেছেন। এখনই [LINK] এ পিন ও ওটিপি দিয়ে টাকা গ্রহণ করুন।",
      en: "Congrats! You won Tk 5,000 cashback. Enter your PIN and OTP at [LINK] now to claim it.",
    },
    flagged: {
      bn: ["৫,০০০ টাকা ক্যাশব্যাক", "পিন ও ওটিপি", "এখনই"],
      en: ["Tk 5,000 cashback", "PIN and OTP", "now"],
    },
    risk: "High",
    title: { bn: "টাকা পাঠাবেন না", en: "Do not send money" },
    action: {
      bn: "আসল বিকাশ কখনো পিন বা ওটিপি চায় না।",
      en: "Real bKash staff never ask for your PIN or OTP.",
    },
    reasons: {
      bn: ["পিন ও ওটিপি চাওয়া হয়েছে", "অযাচিত পুরস্কারের প্রলোভন", "তাড়াহুড়ো করার চাপ"],
      en: ["Asks for your PIN and OTP", "Unexpected prize", "Pressure to act now"],
    },
    cta: { bn: "১৬২৪৭ নম্বরে কল করুন", en: "Call 16247" },
  },
  {
    id: "wrong_number",
    tab: { bn: "ভুল নম্বরে টাকা", en: "Refund trap" },
    sender: "+880 17** ***904",
    channel: "whatsapp",
    text: {
      bn: "ভাই, ভুল করে আপনার নম্বরে ২,০০০ টাকা চলে গেছে। আমার মা হাসপাতালে, দয়া করে এখনই ফেরত পাঠান।",
      en: "Brother, Tk 2,000 went to your number by mistake. My mother is in hospital, please send it back now.",
    },
    flagged: {
      bn: ["ভুল করে", "হাসপাতালে", "এখনই ফেরত পাঠান"],
      en: ["by mistake", "in hospital", "send it back now"],
    },
    risk: "High",
    title: { bn: "আগে ব্যালেন্স দেখুন", en: "Check your balance first" },
    action: {
      bn: "নিজের অ্যাপে লেনদেন মিলিয়ে নিন। টাকা না এলে কিছু ফেরত দেবেন না।",
      en: "Open your own app. If no money arrived, send nothing back.",
    },
    reasons: {
      bn: ["আবেগ দিয়ে চাপ দেওয়া", "যাচাই ছাড়া ফেরতের অনুরোধ"],
      en: ["Emotional pressure", "Refund asked without proof"],
    },
    cta: { bn: "১৬২৪৭ নম্বরে কল করুন", en: "Call 16247" },
  },
  {
    id: "genuine",
    tab: { bn: "আসল লেনদেন", en: "Real receipt" },
    sender: "bKash",
    channel: "sms",
    text: {
      bn: "You have received Tk 500.00 from 01712***456. Balance: Tk 1,250.00. TrxID 9X48LKQ23",
      en: "You have received Tk 500.00 from 01712***456. Balance: Tk 1,250.00. TrxID 9X48LKQ23",
    },
    flagged: { bn: [], en: [] },
    risk: "Low",
    title: { bn: "পরিচিত সতর্কতা চিহ্ন নেই", en: "No common warning signs" },
    action: {
      bn: "কম ঝুঁকি মানে নিরাপদ নয়। অ্যাপে ব্যালেন্স মিলিয়ে নিন।",
      en: "Low risk is not safe. Still confirm the balance in your app.",
    },
    reasons: {
      bn: ["সাধারণ লেনদেনের ফরম্যাট", "পিন বা ওটিপি চাওয়া হয়নি"],
      en: ["Standard receipt format", "No PIN or OTP requested"],
    },
    cta: { bn: "অ্যাপে ব্যালেন্স দেখুন", en: "Check balance in app" },
  },
];

const STEPS = {
  bn: ["নম্বর ও ব্যক্তিগত তথ্য ঢাকা", "সতর্কতা চিহ্ন খোঁজা", "ঝুঁকি মেলানো", "পরামর্শ তৈরি"],
  en: ["Masking numbers and names", "Looking for warning signs", "Weighing the risk", "Writing your next step"],
};

type Stage = "message" | "checking" | "result";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// Ring of eight arcs around the phone. `lit` arcs glow in Lantern.
function WatchRing({ lit }: { lit: number }) {
  const r = 46;
  const arcs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const gap = 7;
        const a0 = ((i * 45 + gap / 2 - 90) * Math.PI) / 180;
        const a1 = (((i + 1) * 45 - gap / 2 - 90) * Math.PI) / 180;
        return `M ${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${
          50 + r * Math.cos(a1)
        } ${50 + r * Math.sin(a1)}`;
      }),
    [],
  );
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
      {arcs.map((d, i) => {
        const on = i < lit;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            strokeWidth={on ? 1.6 : 1}
            stroke={on ? "var(--color-accent)" : "var(--color-border-strong)"}
            strokeOpacity={on ? 1 : 0.55}
            style={{ transition: "stroke 400ms var(--ease-out), stroke-width 400ms var(--ease-out)" }}
          />
        );
      })}
    </svg>
  );
}

function highlight(text: string, words: string[]) {
  if (!words.length) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return parts.map((p, i) =>
    words.includes(p) ? (
      <mark
        key={i}
        className="rounded-[3px] bg-risk-high/20 px-0.5 text-inherit underline decoration-risk-high decoration-2 underline-offset-[3px]"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function PhoneDemo({ isBn }: { isBn: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>(reduced ? "result" : "message");
  const [step, setStep] = useState(reduced ? 4 : 0);
  const [paused, setPaused] = useState(false);
  const lang = isBn ? "bn" : "en";
  const s = DEMO_SCENARIOS[index];
  const isHigh = s.risk === "High";

  // Story timeline: message (1.4s) -> four check steps (0.65s each) -> result (5.5s) -> next.
  useEffect(() => {
    if (reduced) {
      setStage("result");
      setStep(4);
      return;
    }
    if (paused) return;
    let t: number;
    if (stage === "message") t = window.setTimeout(() => setStage("checking"), 1400);
    else if (stage === "checking") {
      t =
        step < 4
          ? window.setTimeout(() => setStep((n) => n + 1), 650)
          : window.setTimeout(() => setStage("result"), 250);
    } else {
      t = window.setTimeout(() => {
        setIndex((i) => (i + 1) % DEMO_SCENARIOS.length);
        setStage("message");
        setStep(0);
      }, 5500);
    }
    return () => window.clearTimeout(t);
  }, [stage, step, paused, reduced]);

  const pick = (i: number) => {
    setIndex(i);
    setStep(reduced ? 4 : 0);
    setStage(reduced ? "result" : "message");
  };

  const lit = stage === "message" ? 0 : stage === "checking" ? step * 2 : 8;

  return (
    <div
      className="flex flex-col items-center gap-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative flex aspect-square w-full max-w-[600px] items-center justify-center">
        <WatchRing lit={lit} />

        {/* Device (always dark, like a real phone) */}
        <div
          className="force-dark relative h-[500px] w-[248px] rounded-[44px] border border-[#2f4540] bg-[#070d0c] p-2.5 shadow-[0_40px_80px_-30px_rgba(6,14,12,0.55)] sm:h-[530px] sm:w-[262px]"
          role="img"
          aria-label={
            isBn
              ? `উদাহরণ: ${s.tab.bn}। ফলাফল: ${isHigh ? "উচ্চ ঝুঁকি" : "কম ঝুঁকি"}। ${s.title.bn}।`
              : `Example: ${s.tab.en}. Result: ${isHigh ? "High risk" : "Low risk"}. ${s.title.en}.`
          }
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-[34px] bg-bg text-text">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-text">
              <span className="tabular-nums">{isBn ? "৯:৪১" : "9:41"}</span>
              <span className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-[#070d0c]" />
              <span className="flex items-center gap-1 text-[13px]">
                <Icon icon="ph:cell-signal-full" aria-hidden />
                <Icon icon="ph:wifi-high" aria-hidden />
                <Icon icon="ph:battery-high" aria-hidden />
              </span>
            </div>

            {/* Thread header */}
            <div className="flex items-center gap-2.5 border-b border-border px-4 pb-3 pt-2">
              <Icon icon="ph:caret-left" className="text-lg text-text-2" aria-hidden />
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-sm text-text-2">
                <Icon icon={s.channel === "sms" ? "ph:chat-text" : "ph:whatsapp-logo"} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] font-medium text-text">{s.sender}</p>
                <p className="text-[11px] text-faint">{s.channel === "sms" ? "SMS" : "WhatsApp"}</p>
              </div>
            </div>

            {/* Message */}
            <div className="flex-1 px-4 pt-4">
              <div
                key={`${s.id}-msg`}
                className="max-w-[92%] animate-fade-up rounded-[18px] rounded-tl-[6px] bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-text"
                lang={isBn && s.id !== "genuine" ? "bn" : "en"}
              >
                {stage === "result" ? highlight(s.text[lang], s.flagged[lang]) : s.text[lang]}
              </div>
              <p className="mt-1.5 pl-1 text-[10.5px] text-faint">{isBn ? "এইমাত্র" : "Just now"}</p>
            </div>

            {/* Prohori sheet */}
            <div
              className={`absolute inset-x-2 bottom-2 rounded-[28px] border border-border bg-surface p-4 transition-transform duration-500 ease-out ${
                stage === "message" ? "translate-y-[110%]" : "translate-y-0"
              }`}
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong" />

              {stage !== "result" ? (
                <div>
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-text">
                    <Icon icon="ph:circle-notch" className="animate-spin text-base text-brand" aria-hidden />
                    {isBn ? "প্রহরী যাচাই করছে" : "Prohori is checking"}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {STEPS[lang].map((label, i) => {
                      const done = i < step;
                      const active = i === step;
                      return (
                        <li key={label} className="flex items-center gap-2.5 text-[12.5px]">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                              done
                                ? "border-transparent bg-pine text-bone"
                                : active
                                  ? "border-brand text-brand"
                                  : "border-border text-faint"
                            }`}
                          >
                            {done ? <Icon icon="ph:check" className="text-[11px]" aria-hidden /> : null}
                          </span>
                          <span className={done || active ? "text-text" : "text-faint"}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div key={`${s.id}-res`} className="animate-fade-up">
                  <div
                    className={`flex items-start gap-2.5 rounded-[18px] border p-3 ${
                      isHigh ? "border-risk-high/50 bg-risk-high-tint" : "border-risk-low/50 bg-risk-low-tint"
                    }`}
                  >
                    <Icon
                      icon={isHigh ? "ph:hand-palm-bold" : "ph:info-bold"}
                      className={`mt-0.5 shrink-0 text-xl ${isHigh ? "text-risk-high" : "text-risk-low"}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className={`text-[11.5px] font-semibold ${isHigh ? "text-risk-high" : "text-risk-low"}`}>
                        {isHigh ? (isBn ? "উচ্চ ঝুঁকি" : "High risk") : isBn ? "কম ঝুঁকি" : "Low risk"}
                      </p>
                      <p className="font-display text-[17px] font-semibold leading-snug text-text">{s.title[lang]}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[12.5px] leading-relaxed text-text">{s.action[lang]}</p>

                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {s.reasons[lang].map((r) => (
                      <li key={r} className="flex items-center gap-2 text-[12px] text-text-2">
                        <span
                          className={`h-1 w-1 shrink-0 rounded-full ${isHigh ? "bg-risk-high" : "bg-risk-low"}`}
                        />
                        {r}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3.5 flex h-10 items-center justify-center gap-2 rounded-full bg-bone text-[13px] font-semibold text-raat">
                    <Icon icon={isHigh ? "ph:phone-call" : "ph:wallet"} aria-hidden />
                    {s.cta[lang]}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario switcher */}
      <div
        role="tablist"
        aria-label={isBn ? "উদাহরণ বার্তা" : "Example messages"}
        className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1 [scrollbar-width:none]"
      >
        {DEMO_SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => pick(i)}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-200 ${
              i === index ? "bg-pine text-bone" : "text-text-2 hover:text-text"
            }`}
          >
            {sc.tab[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
