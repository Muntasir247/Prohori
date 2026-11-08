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
    icon: "ph:wallet",
  },
  {
    id: "rocket",
    name: "Rocket (DBBL)",
    name_bn: "রকেট (ডাচ্-বাংলা)",
    phone: "16216",
    icon: "ph:device-mobile",
  },
  {
    id: "upay",
    name: "Upay (UCB)",
    name_bn: "উপায় (ইউসিবি)",
    phone: "16268",
    icon: "ph:money",
  },
  {
    id: "other",
    name: "Bank / Other MFS",
    name_bn: "ব্যাংক বা অন্যান্য",
    phone: "999",
    icon: "ph:bank",
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
      <div className="mx-auto max-w-2xl py-2 flex flex-col gap-6 w-full">
        {/* Navigation & Offline indicator */}
        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <Link
            to="/check"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1 text-muted hover:text-text hover:border-brand/40 transition-colors"
          >
            <Icon icon="ph:arrow-left" />
            <span>{t("common.back")}</span>
          </Link>
          {isOffline && (
            <span
              className="flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-xs font-mono font-bold text-accent"
              data-testid="offline-badge"
            >
              <Icon icon="ph:wifi-slash" />
              <span>{t("already_sent.offline_mode")}</span>
            </span>
          )}
        </div>

        {/* Emergency Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-risk-high" />
            <span className="text-xs text-risk-high font-semibold">
              {isBn ? "জরুরি প্রোটোকল" : "EMERGENCY PROTOCOL"}
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text leading-tight"
            data-testid="already-sent-title"
          >
            {t("already_sent.title")}
          </h1>
          <p className="text-sm text-muted leading-relaxed max-w-xl">
            {isBn
              ? "প্রতারণার শিকার হলে প্রতিটি মিনিট অত্যন্ত মূল্যবান। অবিলম্বে নিচের পদক্ষেপগুলো অনুসরণ করুন।"
              : "When you have sent money to a scammer, every minute counts. Take these verified emergency steps immediately."}
          </p>
        </header>

        {/* Honest reality check line (Doc 01 S18 mandatory requirement) */}
        <div
          className="flex items-start gap-3.5 rounded-2xl border border-risk-high/40 bg-gradient-to-r from-risk-high/20 via-risk-high/10 to-surface p-4 sm:p-5 text-text"
          role="note"
          data-testid="honest-recovery-line"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-risk-high/20 text-risk-high text-xl shrink-0 mt-0.5">
            <Icon icon="ph:warning-circle" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <strong className="text-xs text-risk-high font-semibold">
              {isBn ? "বাস্তবধর্মী সতর্কবার্তা" : "CRITICAL REALITY CHECK"}
            </strong>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-text">
              {t("already_sent.honest_line")}
            </p>
          </div>
        </div>

        {/* 4 Ordered Steps */}
        <div className="flex flex-col gap-5">
          {/* STEP 1: Call Provider Helpline with Provider Picker */}
          <section
            className="double-bezel"
            data-testid="step-1-card"
          >
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-on-accent shadow-sm">
                  ১
                </span>
                <h2 className="text-base sm:text-lg font-bold text-text">
                  {t("already_sent.step1_title")}
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {t("already_sent.step1_desc")}
              </p>

              {/* Provider Picker Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-xs font-semibold text-muted">
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
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                          isSelected
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-text"
                        }`}
                        data-testid={`provider-picker-${prov.id}`}
                      >
                        <span className="truncate">
                          {isBn ? prov.name_bn : prov.name}
                        </span>
                        {isSelected && (
                          <Icon icon="ph:check-circle" className="text-sm shrink-0 text-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Call Helpline Button */}
              <a
                href={`tel:${selectedProvider.phone}`}
                className="flex items-center justify-center gap-3 rounded-xl bg-accent px-5 py-4 text-sm font-bold text-on-accent hover:brightness-110 active:scale-98 transition-all"
                data-testid="step-1-call-btn"
              >
                <Icon icon="ph:phone-call" className="text-xl" />
                <span>
                  {t("already_sent.call_provider", {
                    provider: isBn ? selectedProvider.name_bn : selectedProvider.name,
                    number: selectedProvider.phone,
                  })}
                </span>
              </a>
            </div>
          </section>

          {/* STEP 2: Keep transaction ID and screenshots */}
          <section
            className="double-bezel"
            data-testid="step-2-card"
          >
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-on-accent shadow-sm">
                  ২
                </span>
                <h2 className="text-base sm:text-lg font-bold text-text">
                  {t("already_sent.step2_title")}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {t("already_sent.step2_desc")}
              </p>
              <div className="rounded-xl border border-border bg-bg/80 p-3.5 text-xs text-text flex items-center gap-3 shadow-inner">
                <Icon icon="ph:camera" className="text-xl text-brand shrink-0" />
                <span className="font-medium leading-relaxed">
                  {isBn
                    ? "এসএমএস বা চ্যাট কখনো ডিলিট করবেন না। ট্রানজেকশন আইডি (TrxID) লিখে রাখুন।"
                    : "Keep full screen captures with timestamps, phone numbers, and transaction IDs."}
                </span>
              </div>
            </div>
          </section>

          {/* STEP 3: Do not pay anyone who offers to recover it */}
          <section
            className="double-bezel"
            data-testid="step-3-card"
          >
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-on-accent shadow-sm">
                  ৩
                </span>
                <h2 className="text-base sm:text-lg font-bold text-text">
                  {t("already_sent.step3_title")}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {t("already_sent.step3_desc")}
              </p>
              <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-3.5 text-xs text-text flex items-center gap-3">
                <Icon icon="ph:warning" className="text-xl text-risk-high shrink-0" />
                <span className="font-semibold text-risk-high leading-relaxed">
                  {isBn
                    ? "টাকা উদ্ধার ফি চাওয়া আরেকটি প্রতারণা। কখনো কোনো অগ্রিম ফি দেবেন না।"
                    : "Recovery fees are always a scam. Never pay anyone promising to recover money."}
                </span>
              </div>
            </div>
          </section>

          {/* STEP 4: Report to official law enforcement channels */}
          <section
            className="double-bezel"
            data-testid="step-4-card"
          >
            <div className="double-bezel-inner p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-on-accent shadow-sm">
                  ৪
                </span>
                <h2 className="text-base sm:text-lg font-bold text-text">
                  {t("already_sent.step4_title")}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {t("already_sent.step4_desc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href="tel:999"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-xs font-bold text-text hover:border-accent hover:text-accent transition-all active:scale-95 shadow-sm"
                  data-testid="call-999-btn"
                >
                  <Icon icon="ph:phone" className="text-base text-accent" />
                  <span>{t("already_sent.call_999")}</span>
                </a>
                <a
                  href="tel:01320010148"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-xs font-bold text-text hover:border-brand hover:text-brand transition-all active:scale-95 shadow-sm"
                  data-testid="call-cyber-btn"
                >
                  <Icon icon="ph:lock-simple" className="text-base text-brand" />
                  <span>{t("already_sent.call_cyber_police")}</span>
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Back / Check CTA */}
        <div className="flex flex-col items-center gap-2 pt-4 pb-8">
          <Link
            to="/check"
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5"
          >
            <Icon icon="ph:tray" />
            <span>{isBn ? "প্রহরীতে অন্য বার্তা যাচাই করুন" : "Check another message on Prohori"}</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
