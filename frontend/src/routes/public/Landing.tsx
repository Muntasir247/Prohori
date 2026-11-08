import { Icon } from "@iconify/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { LanguageToggle } from "@/components/LanguageToggle";
import { EighthWatchMark, ProhoriLogo } from "@/components/brand/ProhoriLogo";
import { PhoneDemo } from "@/components/landing/PhoneDemo";
import { checksApi } from "@/features/checks/api";
import type { SampleItem } from "@/features/checks/types";

// S01 Landing.
// Design read: Bangla-first consumer fintech-safety landing for rushed mobile
// money users. Calm, premium, trust-first. Dials: variance 7, motion 5, density 3.
// Shape rule for this page: buttons and pills are full-round, cards are 28px,
// inner tiles 18px.

type Lang = "bn" | "en";
type Copy = Record<Lang, string>;

const SCAM_MESSAGES: {
  id: string;
  channel: string;
  icon: string;
  tactic: Copy;
  text: Copy;
  flagged: Record<Lang, string[]>;
}[] = [
  {
    id: "block",
    channel: "SMS",
    icon: "ph:chat-text",
    tactic: { bn: "অ্যাকাউন্ট বন্ধের হুমকি", en: "Account block threat" },
    text: {
      bn: "আপনার বিকাশ অ্যাকাউন্ট ২৪ ঘণ্টার মধ্যে বন্ধ হয়ে যাবে। চালু রাখতে এই নম্বরে ওটিপি পাঠান।",
      en: "Your bKash account will be blocked in 24 hours. Send the OTP to this number to keep it active.",
    },
    flagged: { bn: ["২৪ ঘণ্টার মধ্যে বন্ধ", "ওটিপি পাঠান"], en: ["blocked in 24 hours", "Send the OTP"] },
  },
  {
    id: "lottery",
    channel: "Messenger",
    icon: "ph:messenger-logo",
    tactic: { bn: "লটারি জেতার খবর", en: "Lottery win" },
    text: {
      bn: "অভিনন্দন! আপনি ২৫ লক্ষ টাকার লটারি জিতেছেন। পুরস্কার পেতে প্রসেসিং ফি ১,৫০০ টাকা পাঠান।",
      en: "Congratulations! You won a Tk 25 lakh lottery. Send a Tk 1,500 processing fee to claim it.",
    },
    flagged: { bn: ["লটারি জিতেছেন", "প্রসেসিং ফি"], en: ["won a Tk 25 lakh lottery", "processing fee"] },
  },
  {
    id: "job",
    channel: "WhatsApp",
    icon: "ph:whatsapp-logo",
    tactic: { bn: "ঘরে বসে চাকরি", en: "Work-from-home job" },
    text: {
      bn: "ঘরে বসে দিনে ৩,০০০ টাকা আয় করুন। রেজিস্ট্রেশন ফি মাত্র ৫০০ টাকা, আজই পাঠান।",
      en: "Earn Tk 3,000 a day from home. Registration fee only Tk 500, send it today.",
    },
    flagged: { bn: ["দিনে ৩,০০০ টাকা", "রেজিস্ট্রেশন ফি"], en: ["Tk 3,000 a day", "Registration fee"] },
  },
  {
    id: "relative",
    channel: "SMS",
    icon: "ph:chat-text",
    tactic: { bn: "আত্মীয়ের জরুরি বিপদ", en: "Relative in trouble" },
    text: {
      bn: "আমি তোর মামা, নতুন নম্বর। খুব বিপদে আছি, কাউকে বলিস না, এখনই ১০,০০০ টাকা পাঠা।",
      en: "It's your uncle, new number. I'm in trouble, tell no one, send Tk 10,000 right now.",
    },
    flagged: { bn: ["নতুন নম্বর", "কাউকে বলিস না", "এখনই"], en: ["new number", "tell no one", "right now"] },
  },
];

const HELPLINES: { name: string | Copy; num: string }[] = [
  { name: "bKash", num: "16247" },
  { name: "Nagad", num: "16167" },
  { name: "Rocket", num: "16216" },
  { name: { bn: "জাতীয় জরুরি সেবা", en: "National emergency" }, num: "999" },
];

// Scroll reveal: IntersectionObserver, no scroll listeners. Reduced motion is
// handled by the global CSS override (transitions collapse to ~0ms).
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Flagged({ text, words }: { text: string; words: string[] }) {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = words.length ? text.split(new RegExp(`(${escaped.join("|")})`, "g")) : [text];
  return (
    <>
      {parts.map((p, i) =>
        words.includes(p) ? (
          <span key={i} className="underline decoration-risk-high decoration-2 underline-offset-4">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const isBn = i18n.language === "bn";
  const lang: Lang = isBn ? "bn" : "en";
  const c = (copy: Copy) => copy[lang];

  useEffect(() => {
    checksApi.getSamples().then(setSamples).catch(() => setSamples([]));
  }, []);

  const tryMessage = (text: string) =>
    navigate("/check/message", { state: { prefilledText: text, isSample: true } });

  const pill =
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition-[background-color,border-color,transform] duration-200 ease-out active:scale-[0.98]";

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-bg text-text">
      <a href="#main" className="skip-link">
        {t("a11y.skip_to_content")}
      </a>

      {/* Nav: 64px, one line */}
      <header className="sticky top-0 z-header border-b border-border/70 bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" aria-label={t("app.name")} className="inline-flex rounded-full">
            <ProhoriLogo size="sm" />
          </Link>
          <nav aria-label={t("nav.main")} className="hidden items-center gap-8 text-[15px] md:flex">
            <a href="#how" className="text-text-2 transition-colors hover:text-text">
              {c({ bn: "যেভাবে কাজ করে", en: "How it works" })}
            </a>
            <a href="#scams" className="text-text-2 transition-colors hover:text-text">
              {c({ bn: "চেনা প্রতারণা", en: "Common scams" })}
            </a>
            <Link to="/already-sent" className="text-text-2 transition-colors hover:text-text">
              {t("landing.card_sent_title")}
            </Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <Link
              to="/login"
              data-testid="landing-check-button"
              className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:border-border-strong hover:bg-surface"
            >
              {t("landing.sign_in")}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero: asymmetric split, live product on the right */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-10%] top-[-10%] h-[640px] w-[640px] rounded-full opacity-60 [background:radial-gradient(closest-side,var(--color-brand-glow),transparent)] lg:right-[2%]"
          />
          <div className="relative mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-12 px-4 pb-16 pt-12 md:px-8 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20">
            <div className="flex animate-fade-up flex-col items-start">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-2">
                <EighthWatchMark size={16} className="text-text-2" />
                {t("landing.eyebrow")}
              </p>

              <h1 className="mt-7 max-w-[16ch] text-[40px] font-bold leading-[1.15] tracking-[-0.02em] text-text sm:text-[54px] lg:text-[62px] lg:leading-[1.12]">
                {isBn ? (
                  <>
                    টাকা পাঠানোর আগে <span className="text-brand">এক মুহূর্ত</span> ভাবুন
                  </>
                ) : (
                  <>
                    Pause <span className="text-brand">before</span> you send money
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-text-2 sm:text-xl">
                {c({
                  bn: "সন্দেহজনক বার্তা পেস্ট করুন। কয়েক সেকেন্ডে জানুন এটি প্রতারণা কিনা, আর এখন কী করবেন।",
                  en: "Paste a suspicious message. In seconds, see if it looks like a scam and what to do next.",
                })}
              </p>

              <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  to="/check/message"
                  data-testid="hero-primary-cta"
                  className={`${pill} group bg-accent text-on-accent hover:bg-accent-hover`}
                >
                  {t("landing.hero_check_message")}
                  <Icon
                    icon="ph:arrow-right"
                    className="text-lg transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  to="/check/payment"
                  data-testid="hero-secondary-cta"
                  className={`${pill} border border-border-strong text-text hover:bg-surface`}
                >
                  <Icon icon="ph:paper-plane-tilt" className="text-lg text-text-2" aria-hidden />
                  {t("landing.hero_check_payment")}
                </Link>
              </div>
            </div>

            <div className="relative">
              <PhoneDemo isBn={isBn} />
            </div>
          </div>
        </section>

        {/* Promise band: plain facts inline, no cards */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-4 px-4 py-6 text-[15px] text-text-2 sm:grid-cols-2 md:px-8 lg:flex lg:items-center lg:justify-between">
            {[
              { icon: "ph:user-circle-dashed", text: { bn: "অ্যাকাউন্ট ছাড়াই যাচাই", en: "No account needed" } },
              { icon: "ph:translate", text: { bn: "বাংলায় সহজ উত্তর", en: "Plain answers in Bangla" } },
              { icon: "ph:eye-slash", text: { bn: "নম্বর ও নাম আগে ঢেকে দেওয়া হয়", en: "Numbers and names masked first" } },
              { icon: "ph:wallet", text: { bn: "আপনার টাকা বা অ্যাকাউন্ট দেখে না", en: "Never sees your money or account" } },
            ].map((f) => (
              <p key={f.icon} className="flex items-center gap-2.5">
                <Icon icon={f.icon} className="shrink-0 text-xl text-text" aria-hidden />
                {c(f.text)}
              </p>
            ))}
          </div>
        </section>

        {/* Scam gallery: horizontal scroll-snap */}
        <section id="scams" className="scroll-mt-16 py-20 lg:py-28">
          <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8">
            <Reveal className="max-w-[640px]">
              <h2 className="text-[34px] font-bold leading-tight tracking-[-0.01em] sm:text-[44px]">
                {c({ bn: "প্রতারকেরা এভাবেই লেখে", en: "This is how scammers write" })}
              </h2>
              <p className="mt-4 text-lg text-text-2">
                {c({
                  bn: "তাড়া, পুরস্কার, ভয় বা গোপন কোড। চিহ্নিত অংশগুলো দেখুন, অথবা যেকোনোটি যাচাই করে দেখুন।",
                  en: "Rush, rewards, fear or secret codes. See the marked words, or try checking any of these.",
                })}
              </p>
            </Reveal>
          </div>

          <div className="mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 md:scroll-px-8 xl:scroll-px-[max(2rem,calc((100vw_-_1240px)/2_+_2rem))] [scrollbar-width:none] md:px-8 xl:px-[max(2rem,calc((100vw_-_1240px)/2_+_2rem))]">
            {SCAM_MESSAGES.map((m, i) => (
              <Reveal key={m.id} delay={i * 80} className="w-[300px] shrink-0 snap-start sm:w-[340px]">
                <article className="flex h-full flex-col justify-between gap-8 rounded-[28px] border border-border bg-surface p-6">
                  <div>
                    <div className="flex items-center justify-between text-sm text-text-2">
                      <span className="inline-flex items-center gap-2">
                        <Icon icon={m.icon} className="text-lg" aria-hidden />
                        {m.channel}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-high-tint px-2.5 py-1 text-xs font-semibold text-risk-high">
                        <Icon icon="ph:octagon" aria-hidden />
                        {c({ bn: "উচ্চ ঝুঁকি", en: "High risk" })}
                      </span>
                    </div>
                    <p className="mt-5 rounded-[18px] rounded-tl-[6px] bg-surface-2 p-4 text-[15px] leading-relaxed text-text">
                      <Flagged text={c(m.text)} words={m.flagged[lang]} />
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <p className="font-display text-lg font-semibold leading-snug">{c(m.tactic)}</p>
                    <button
                      type="button"
                      onClick={() => tryMessage(c(m.text))}
                      aria-label={c({ bn: `যাচাই করুন: ${m.tactic.bn}`, en: `Check: ${m.tactic.en}` })}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-text transition-colors hover:bg-surface-2"
                    >
                      <Icon icon="ph:arrow-up-right" className="text-lg" aria-hidden />
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {samples.length > 0 && (
            <div className="mx-auto mt-6 flex w-full max-w-[1240px] flex-wrap items-center gap-2 px-4 md:px-8">
              <span className="mr-1 text-sm text-text-2">{t("landing.sample_chips_label")}</span>
              {samples.slice(0, 5).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => tryMessage(sample.body)}
                  data-testid="landing-sample-chip"
                  className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
                >
                  {isBn ? sample.label_bn : sample.label_en}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* How it works: bento, 5 items in 5 cells */}
        <section id="how" className="scroll-mt-16 pb-20 lg:pb-28">
          <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8">
            <Reveal>
              <h2 className="max-w-[18ch] text-[34px] font-bold leading-tight tracking-[-0.01em] sm:text-[44px]">
                {c({ bn: "এক বার্তা, এক পরিষ্কার পরের ধাপ", en: "One message in, one clear next step out" })}
              </h2>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
              {/* A: paste (pine, large) */}
              <Reveal className="md:col-span-4 md:row-span-2">
                <div className="force-dark relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] bg-pine p-7 text-bone sm:p-9">
                  <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 text-bone opacity-[0.12]">
                    <EighthWatchMark size={300} />
                  </div>
                  <div className="relative max-w-[36ch]">
                    <h3 className="text-[26px] font-semibold leading-snug">
                      {c({ bn: "পেস্ট করুন, ব্যস", en: "Paste it. That's it." })}
                    </h3>
                    <p className="mt-3 text-[17px] leading-relaxed text-bone/75">
                      {c({
                        bn: "এসএমএস, মেসেঞ্জার বা হোয়াটসঅ্যাপ, যেকোনো বার্তা। লগইন লাগে না, কারণ চাপের মুহূর্তে কেউ ফর্ম পূরণ করে না।",
                        en: "SMS, Messenger or WhatsApp. No sign-in, because nobody fills in forms under pressure.",
                      })}
                    </p>
                  </div>
                  <div className="relative mt-8 rounded-[18px] border border-bone/15 bg-raat/40 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-bone/60">
                      <span>{t("message_check.textarea_label")}</span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bone/20 px-3 py-1 text-bone/80">
                        <Icon icon="ph:clipboard-text" aria-hidden />
                        {t("message_check.paste_button")}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-bone/90">{c(SCAM_MESSAGES[0].text)}</p>
                  </div>
                </div>
              </Reveal>

              {/* B: masking */}
              <Reveal className="md:col-span-2" delay={80}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-[28px] border border-border bg-surface p-7">
                  <Icon icon="ph:eye-slash" className="text-2xl text-text" aria-hidden />
                  <div>
                    <div className="flex flex-col gap-1 font-mono text-[15px]">
                      <span className="text-faint line-through decoration-faint">01712-345678</span>
                      <span className="text-text">+880 17** ***678</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                      {c({ bn: "আগে তথ্য ঢাকা হয়", en: "Private details masked first" })}
                    </h3>
                  </div>
                </div>
              </Reveal>

              {/* C: answers in your language (lantern tint) */}
              <Reveal className="md:col-span-2" delay={140}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-[28px] bg-brand-glow p-7 ring-1 ring-inset ring-brand/25">
                  <span lang="bn" className="font-display text-[44px] font-bold leading-none text-brand">
                    অ
                  </span>
                  <h3 className="text-lg font-semibold">
                    {c({ bn: "উত্তর আপনার ভাষায়", en: "Answers in your language" })}
                  </h3>
                </div>
              </Reveal>

              {/* D: risk meter */}
              <Reveal className="md:col-span-3" delay={80}>
                <div className="flex h-full flex-col justify-between gap-8 rounded-[28px] border border-border bg-surface p-7">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: "low", l: { bn: "কম", en: "Low" }, cls: "bg-risk-low", icon: "ph:info" },
                      { k: "med", l: { bn: "মাঝারি", en: "Medium" }, cls: "bg-risk-medium", icon: "ph:warning" },
                      { k: "high", l: { bn: "উচ্চ", en: "High" }, cls: "bg-risk-high", icon: "ph:octagon" },
                    ].map((m) => (
                      <div key={m.k} className="flex flex-col gap-2.5">
                        <span className={`h-1.5 rounded-full ${m.cls}`} />
                        <span className="inline-flex items-center gap-1.5 text-sm text-text-2">
                          <Icon icon={m.icon} aria-hidden />
                          {c(m.l)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {c({ bn: "তিন ধাপের সহজ ঝুঁকি", en: "Three plain risk levels" })}
                    </h3>
                    <p className="mt-1.5 text-[15px] text-text-2">
                      {c({
                        bn: "কোনো জটিল স্কোর নয়। একটি শব্দ, একটি চিহ্ন আর একটি পরের ধাপ।",
                        en: "No cryptic scores. A word, a shape and one next step.",
                      })}
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* E: human review */}
              <Reveal className="md:col-span-3" delay={140}>
                <div className="flex h-full flex-col justify-between gap-8 rounded-[28px] border border-border bg-surface-2 p-7">
                  <Icon icon="ph:users-three" className="text-2xl text-text" aria-hidden />
                  <div>
                    <h3 className="text-lg font-semibold">{t("landing.promise_review_title")}</h3>
                    <p className="mt-1.5 text-[15px] text-text-2">{t("landing.promise_review_desc")}</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Manifesto: the honest limit, as big type */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-20 md:px-8 lg:py-32">
            <Reveal>
              <p className="max-w-[20ch] font-display text-[36px] font-bold leading-[1.2] tracking-[-0.01em] sm:text-[52px] lg:text-[64px]">
                {isBn ? (
                  <>
                    প্রহরী কখনো বলবে না যে কোনো পেমেন্ট <span className="text-faint">শতভাগ নিরাপদ।</span>
                  </>
                ) : (
                  <>
                    Prohori will never tell you a payment is <span className="text-faint">safe.</span>
                  </>
                )}
              </p>
              <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-text-2">
                {c({
                  bn: "আমরা পরিচিত সতর্কতা চিহ্ন খুঁজি আর পরের ধাপ বলি। প্রহরী ভুল করতে পারে। শেষ যাচাই আপনার প্রোভাইডারের হেল্পলাইন।",
                  en: "We look for known warning signs and tell you the next step. Prohori can be wrong. Your provider's helpline is the final check.",
                })}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Already sent money: split, helplines as dial tiles */}
        <section className="pb-20 lg:pb-28">
          <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8">
            <Reveal>
              <div className="grid grid-cols-1 gap-10 rounded-[28px] border border-risk-high/35 bg-risk-high-tint p-7 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
                <div>
                  <Icon icon="ph:siren" className="text-3xl text-risk-high" aria-hidden />
                  <h2 className="mt-5 text-[30px] font-bold leading-tight sm:text-[38px]">
                    {t("landing.card_sent_title")}
                  </h2>
                  <p className="mt-3 max-w-[40ch] text-lg text-text-2">
                    {c({
                      bn: "দেরি করবেন না। এখনই আপনার প্রোভাইডারকে ফোন করুন, তারপর ধাপে ধাপে গাইড দেখুন।",
                      en: "Don't wait. Call your provider now, then follow the step-by-step guide.",
                    })}
                  </p>
                  <Link
                    to="/already-sent"
                    className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-risk-high underline-offset-4 hover:underline"
                  >
                    {c({ bn: "ধাপে ধাপে গাইড", en: "Step-by-step guide" })}
                    <Icon icon="ph:arrow-right" aria-hidden />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {HELPLINES.map((h) => (
                    <a
                      key={h.num}
                      href={`tel:${h.num}`}
                      className="group flex flex-col justify-between gap-6 rounded-[18px] border border-border bg-surface p-5 transition-colors hover:border-border-strong"
                    >
                      <span className="flex items-center justify-between gap-2 text-sm text-text-2">
                        {typeof h.name === "string" ? h.name : c(h.name)}
                        <Icon
                          icon="ph:phone-call"
                          className="shrink-0 text-lg transition-transform group-hover:scale-110"
                          aria-hidden
                        />
                      </span>
                      <span className="font-mono text-[28px] font-medium leading-none tracking-tight text-text sm:text-[32px]">
                        {h.num}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="flex flex-col gap-3">
            <ProhoriLogo size="md" />
            <p className="flex items-center gap-2 text-sm text-faint">
              <Icon icon="ph:flask" aria-hidden />
              {t("app.prototype_notice")}
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-[15px]">
            <Link to="/check/message" className="text-text-2 transition-colors hover:text-text">
              {t("landing.hero_check_message")}
            </Link>
            <Link to="/check/payment" className="text-text-2 transition-colors hover:text-text">
              {t("landing.hero_check_payment")}
            </Link>
            <Link to="/already-sent" className="text-text-2 transition-colors hover:text-text">
              {t("landing.card_sent_title")}
            </Link>
            <Link to="/login" className="text-text-2 transition-colors hover:text-text">
              {t("landing.sign_in")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
