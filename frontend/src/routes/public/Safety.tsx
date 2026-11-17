import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MaskingDiagramIllustration } from "@/components/brand/Illustrations";
import { checksApi } from "@/features/checks/api";
import type { SafeActionResponse } from "@/features/checks/types";

interface InfoRow {
  icon: string;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
}

const INFO_ROWS: InfoRow[] = [
  {
    icon: "ph:magnifying-glass-duotone",
    titleBn: "আমরা কী যাচাই করি",
    titleEn: "What we check",
    bodyBn:
      "সন্দেহজনক এসএমএস, চ্যাট বার্তা এবং পেমেন্টের অনুরোধ বিশ্লেষণ করে ঝুঁকির স্তর (কম, মাঝারি বা উচ্চ), সুনির্দিষ্ট কারণ এবং পরবর্তী নিরাপদ করণীয় দেখাই।",
    bodyEn:
      "We analyze suspicious SMS, chat messages, and payment requests to show a clear risk level (Low, Medium, or High), plain-language reasons, and verified next steps.",
  },
  {
    icon: "ph:lock-key-duotone",
    titleBn: "আমরা কখনো যা চাই না",
    titleEn: "What we never ask for",
    bodyBn:
      "প্রহরী কখনোই আপনার ওটিপি (OTP), পিন (PIN), পাসওয়ার্ড, সিভিভি বা ব্যাংক/মোবাইল ওয়ালেট লগইন তথ্য চায় না। বার্তায় থাকলে সেগুলো সাথে সাথেই মুছে ফেলা হয়।",
    bodyEn:
      "Prohori will never ask for your OTP, PIN, password, CVV, or wallet login credentials. If they appear in pasted text, they are stripped immediately.",
  },
  {
    icon: "ph:eye-slash-duotone",
    titleBn: "আপনার বার্তার তথ্য কীভাবে সুরক্ষিত থাকে",
    titleEn: "What happens to your text",
    bodyBn:
      "সংরক্ষণ বা এআই বিশ্লেষণের আগেই ব্যক্তিগত তথ্য (ফোন নম্বর, অ্যাকাউন্ট নম্বর, নাম ও লিংকের প্যারামিটার) ঢেকে ফেলা হয়। ফোন নম্বর কেবল একমুখী HMAC হ্যাশ হিসেবে সংরক্ষিত হয়।",
    bodyEn:
      "Personal details (phone numbers, account numbers, names, and link query parameters) are masked before storage and before AI analysis. Phone numbers are stored only as keyed one-way HMAC hashes.",
  },
  {
    icon: "ph:warning-circle-duotone",
    titleBn: "প্রহরী যা করতে পারে না",
    titleEn: "What Prohori cannot do",
    bodyBn:
      "প্রহরী কখনো কোনো পেমেন্টকে শতভাগ নিরাপদ বলে ঘোষণা করে না এবং স্বয়ংক্রিয়ভাবে কোনো লেনদেন বা অ্যাকাউন্ট ব্লক করে না। চূড়ান্ত যাচাই সবসময় আপনার প্রোভাইডারের অফিসিয়াল অ্যাপ বা হেল্পলাইনে করুন।",
    bodyEn:
      "Prohori never guarantees a payment is 100% safe and never automatically blocks a payment or account. Always confirm with your provider's official app or helpline.",
  },
  {
    icon: "ph:user-check-duotone",
    titleBn: "সম্মতি ও তথ্য মুছে ফেলা",
    titleEn: "Consent and data deletion",
    bodyBn:
      "রিপোর্ট জমা দেওয়ার আগে আপনার স্পষ্ট সম্মতি নেওয়া হয়। লগইন করা ব্যবহারকারীরা সেটিংস থেকে যেকোনো সময় নিজেদের ডেটা ডাউনলোড বা অ্যাকাউন্ট মুছে ফেলতে পারেন।",
    bodyEn:
      "Submitting a report requires explicit consent. Signed-in users can export their data or delete their account at any time from Settings.",
  },
  {
    icon: "ph:users-three-duotone",
    titleBn: "রিপোর্ট কারা পর্যালোচনা করেন",
    titleEn: "Who reviews reports",
    bodyBn:
      "ব্যবহারকারীদের রিপোর্ট করা কেস প্রশিক্ষিত মানব রিভিউয়াররা যাচাই করেন। প্রতিটি সিদ্ধান্তের পূর্ণ অডিট রেকর্ড সংরক্ষিত থাকে।",
    bodyEn:
      "Reported cases are triaged and verified by trained human reviewers. Every enforcement decision requires a human reviewer and is permanently audit-logged.",
  },
];

export default function Safety() {
  const { i18n } = useTranslation();
  const isBn = i18n.language.startsWith("bn");
  const [helplines, setHelplines] = useState<SafeActionResponse[]>([]);
  const [helplineError, setHelplineError] = useState(false);

  useEffect(() => {
    let active = true;
    checksApi
      .getSafeActions({ context: "both" })
      .then((items) => {
        if (!active) return;
        setHelplines(items.filter((a) => a.phone || a.provider));
      })
      .catch(() => {
        if (!active) return;
        setHelplineError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[640px] space-y-8 py-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          {isBn ? "নিরাপত্তা ও গোপনীয়তা" : "Safety & Privacy"}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {isBn
            ? "প্রহরী কীভাবে কাজ করে এবং আপনার তথ্য সুরক্ষিত রাখে"
            : "How Prohori works and protects your privacy"}
        </h1>
        <p className="text-base leading-relaxed text-ink-muted">
          {isBn
            ? "টাকা পাঠানোর আগে সচেতন সিদ্ধান্ত নিতে সাহায্য করার জন্য প্রহরী তৈরি। আমরা কী করি, কী করি না এবং আপনার তথ্য কীভাবে সামলাই তা নিচে স্পষ্টভাবে দেওয়া হলো।"
            : "Prohori helps you pause and check before sending money. Here is exactly what we do, what we never do, and how your data is handled."}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/check/message"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:opacity-95"
          >
            <Icon icon="ph:shield-check-bold" className="h-4 w-4" />
            {isBn ? "বার্তা যাচাই করুন" : "Check a message"}
          </Link>
          <a
            href="#helplines"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            <Icon icon="ph:phone-call-bold" className="h-4 w-4" />
            {isBn ? "প্রোভাইডার হেল্পলাইন" : "Contact provider helplines"}
          </a>
        </div>
      </header>

      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink"
      >
        <Icon
          icon="ph:info-duotone"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
        />
        <div>
          <p className="font-semibold">
            {isBn ? "প্রোটোটাইপ বিজ্ঞপ্তি" : "Prototype Notice"}
          </p>
          <p className="mt-1 text-ink-muted">
            {isBn
              ? "এই প্রোটোটাইপটি কেবল সিমুলেটেড ডেটা (simulated-v1) ব্যবহার করে — এখানে কোনো বাস্তব ভুক্তভোগীর তথ্য বা প্রকৃত লেনদেন সংরক্ষিত নেই।"
              : "This prototype uses simulated data only (simulated-v1) — no real victims, real phone numbers, or real transactions are stored."}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        {INFO_ROWS.map((row) => (
          <div
            key={row.titleEn}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon icon={row.icon} className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-ink">
                  {isBn ? row.titleBn : row.titleEn}
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {isBn ? row.bodyBn : row.bodyEn}
                </p>
              </div>
            </div>
            {row.titleEn === "What happens to your text" && (
              <div className="flex justify-center rounded-xl border border-border bg-bg p-4">
                <MaskingDiagramIllustration />
              </div>
            )}
          </div>
        ))}
      </section>

      <section
        id="helplines"
        className="space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-semibold text-ink">
          {isBn ? "যাচাইকৃত প্রোভাইডার হেল্পলাইন" : "Verified Provider Helplines"}
        </h2>
        {helplineError || helplines.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {isBn
              ? "আপনার প্রোভাইডারের অফিসিয়াল অ্যাপে দেওয়া হেল্পলাইন নম্বর ব্যবহার করুন।"
              : "Use the number in your provider's official app."}
          </p>
        ) : (
          <ul className="space-y-3">
            {helplines.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas/60 p-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {isBn ? item.label_bn : item.label_en}
                  </p>
                  {(item.body_bn || item.body_en) && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {isBn ? item.body_bn : item.body_en}
                    </p>
                  )}
                </div>
                {item.phone && (
                  <a
                    href={`tel:${item.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 font-mono text-sm font-semibold text-on-brand"
                  >
                    <Icon icon="ph:phone-bold" className="h-4 w-4" />
                    {item.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
