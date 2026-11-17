import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * Global offline banner (Doc 01 S37):
 * Alerts the user when the connection drops and links directly to the
 * service-worker cached S18 Already Sent Money guide.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="global-offline-banner"
      className="border-b border-warning/40 bg-warning-tint px-4 py-2.5 text-xs text-text sm:text-sm"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Icon icon="ph:wifi-slash" className="shrink-0 text-base text-warning" aria-hidden />
          <span>{t("system.offline_banner")}</span>
        </div>
        <Link
          to="/already-sent"
          className="inline-flex items-center gap-1.5 font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
        >
          <span>{t("system.offline_s18_link")}</span>
          <Icon icon="ph:arrow-right" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
