import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { checksApi } from "@/features/checks/api";
import type { SafeActionResponse } from "@/features/checks/types";

interface ProviderOption {
  id: string;
  name: string;
  name_bn: string;
  phone: string;
  icon: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "bkash",
    name: "bKash",
    name_bn: "বিকাশ",
    phone: "16247",
    icon: "simple-icons:bkash",
  },
  {
    id: "nagad",
    name: "Nagad",
    name_bn: "নগদ",
    phone: "16167",
    icon: "ph:wallet-bold",
  },
  {
    id: "rocket",
    name: "Rocket (DBBL)",
    name_bn: "রকেট (ডাচ্-বাংলা)",
    phone: "16216",
    icon: "ph:device-mobile-bold",
  },
  {
    id: "upay",
    name: "Upay (UCB)",
    name_bn: "উপায় (ইউসিবি)",
    phone: "16268",
    icon: "ph:money-bold",
  },
  {
    id: "other",
    name: "Bank / Other MFS",
    name_bn: "ব্যাংক বা অন্যান্য",
    phone: "999",
    icon: "ph:bank-bold",
  },
];

export default function AlreadySent() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const isBn = i18n.language.startsWith("bn");

  // Determine initial provider from query param if given
  const initialProviderParam = searchParams.get("provider")?.toLowerCase();
  const matchedProvider = PROVIDERS.find((p) => p.id === initialProviderParam);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>(
    matchedProvider || PROVIDERS[0]
  );

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" && !navigator.onLine
  );
  const [, setActions] = useState<SafeActionResponse[]>([]);

  useEffect(() => {
    // Monitor online/offline state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fetch verified after_payment actions (cached by service worker when offline)
    checksApi
      .getSafeActions({ context: "after_payment" })
      .then((data) => {
        if (data && data.length > 0) {
          setActions(data);
        }
      })
      .catch(() => {
        // Safe to ignore: offline fallback is hardcoded in UI
      });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl py-4 flex flex-col gap-6">
        {/* Navigation & Offline indicator */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <Link to="/check" className="flex items-center gap-1 hover:text-text">
            <Icon icon="ph:arrow-left-bold" />
            <span>{t("common.back")}</span>
          </Link>
          {isOffline && (
            <span
              className="flex items-center gap-1.5 rounded-full bg-surface-2 border border-border px-2.5 py-1 text-2xs font-bold text-accent"
              data-testid="offline-badge"
            >
              <Icon icon="ph:wifi-slash-bold" />
              <span>{t("already_sent.offline_mode")}</span>
            </span>
          )}
        </div>

        {/* Headline (Doc 01 S18) */}
        <header className="flex flex-col gap-2">
          <h1
            className="text-2xl font-black tracking-tight text-text"
            data-testid="already-sent-title"
          >
            {t("already_sent.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {isBn
              ? "প্রতারণার শিকার হলে প্রতিটি মিনিট অত্যন্ত মূল্যবান। অবিলম্বে নিচের পদক্ষেপগুলো অনুসরণ করুন।"
              : "When you have sent money to a scammer, every minute counts. Take these verified emergency steps immediately."}
          </p>
        </header>

        {/* Honest line (Doc 01 S18 mandatory requirement) */}
        <div
          className="flex items-start gap-3 rounded-2xl border border-risk-high/40 bg-risk-high-tint/50 p-4 text-text shadow-sm"
          role="note"
          data-testid="honest-recovery-line"
        >
          <Icon
            icon="ph:warning-circle-bold"
            className="text-xl text-risk-high shrink-0 mt-0.5"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <strong className="text-xs font-bold text-risk-high uppercase tracking-wide">
              {isBn ? "সতর্কবার্তা" : "Important Reality Check"}
            </strong>
            <p className="text-xs font-semibold leading-relaxed text-text">
              {t("already_sent.honest_line")}
            </p>
          </div>
        </div>

        {/* Ordered Steps (Doc 01 S18: 4 numbered actions with large buttons) */}
        <div className="flex flex-col gap-5">
          {/* STEP 1: Call Provider Helpline with Provider Picker */}
          <section
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            data-testid="step-1-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-bg">
                1
              </span>
              <h2 className="text-sm font-bold text-text">
                {t("already_sent.step1_title")}
              </h2>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {t("already_sent.step1_desc")}
            </p>

            {/* Provider Picker Buttons */}
            <div className="flex flex-col gap-2">
              <label className="text-2xs font-bold uppercase tracking-wider text-muted">
                {t("already_sent.select_provider")}
              </label>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                role="radiogroup"
                aria-label={t("already_sent.select_provider")}
              >
                {PROVIDERS.map((prov) => {
                  const isSelected = selectedProvider.id === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedProvider(prov)}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent shadow-sm"
                          : "border-border bg-surface-2 text-muted hover:border-text hover:text-text"
                      }`}
                      data-testid={`provider-picker-${prov.id}`}
                    >
                      <span className="truncate">
                        {isBn ? prov.name_bn : prov.name}
                      </span>
                      {isSelected && (
                        <Icon icon="ph:check-circle-fill" className="text-sm shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Large Call Helpline Button */}
            <a
              href={`tel:${selectedProvider.phone}`}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-5 py-4 text-sm font-bold text-bg shadow hover:bg-accent/90 transition-transform active:scale-98"
              data-testid="step-1-call-btn"
            >
              <Icon icon="ph:phone-call-fill" className="text-xl" />
              <span>
                {t("already_sent.call_provider", {
                  provider: isBn ? selectedProvider.name_bn : selectedProvider.name,
                  number: selectedProvider.phone,
                })}
              </span>
            </a>
          </section>

          {/* STEP 2: Keep transaction ID and screenshots */}
          <section
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            data-testid="step-2-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-bg">
                2
              </span>
              <h2 className="text-sm font-bold text-text">
                {t("already_sent.step2_title")}
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {t("already_sent.step2_desc")}
            </p>
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-text flex items-center gap-2.5">
              <Icon icon="ph:camera-bold" className="text-lg text-accent shrink-0" />
              <span className="font-medium">
                {isBn
                  ? "এসএমএস বা চ্যাট কখনো ডিলিট করবেন না। ট্রানজেকশন আইডি (TrxID) লিখে রাখুন।"
                  : "Keep full screen captures with timestamps, phone numbers, and transaction IDs."}
              </span>
            </div>
          </section>

          {/* STEP 3: Do not pay anyone who offers to recover it */}
          <section
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            data-testid="step-3-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-bg">
                3
              </span>
              <h2 className="text-sm font-bold text-text">
                {t("already_sent.step3_title")}
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {t("already_sent.step3_desc")}
            </p>
            <div className="rounded-xl border border-risk-high/30 bg-risk-high-tint/40 p-3 text-xs text-text flex items-center gap-2.5">
              <Icon
                icon="ph:shield-warning-bold"
                className="text-lg text-risk-high shrink-0"
              />
              <span className="font-semibold text-risk-high">
                {isBn
                  ? "টাকা উদ্ধার ফি চাওয়া আরেকটি প্রতারণা। কখনো কোনো ফি দেবেন না।"
                  : "Recovery fees are always a scam. Never pay anyone promising to recover money."}
              </span>
            </div>
          </section>

          {/* STEP 4: Report to official law enforcement channels */}
          <section
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            data-testid="step-4-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-bg">
                4
              </span>
              <h2 className="text-sm font-bold text-text">
                {t("already_sent.step4_title")}
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {t("already_sent.step4_desc")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="tel:999"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs font-bold text-text hover:border-accent hover:text-accent transition-colors"
                data-testid="call-999-btn"
              >
                <Icon icon="ph:phone-fill" className="text-base text-accent" />
                <span>{t("already_sent.call_999")}</span>
              </a>
              <a
                href="tel:01320010148"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs font-bold text-text hover:border-accent hover:text-accent transition-colors"
                data-testid="call-cyber-btn"
              >
                <Icon icon="ph:shield-check-fill" className="text-base text-accent" />
                <span>{t("already_sent.call_cyber_police")}</span>
              </a>
            </div>
          </section>
        </div>

        {/* Back / Check CTA */}
        <div className="flex flex-col items-center gap-2 pt-4 pb-8">
          <Link
            to="/check"
            className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
          >
            <Icon icon="ph:shield-bold" />
            <span>{isBn ? "প্রহরীতে অন্য বার্তা যাচাই করুন" : "Check another message on Prohori"}</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

