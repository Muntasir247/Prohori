import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

import { casesApi } from "@/features/cases/api";
import type { CaseDetail as CaseDetailType } from "@/features/cases/types";
import { HighlightedMessage } from "@/components/checks/HighlightedMessage";
import type { HighlightItem } from "@/features/checks/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const lang = (i18n.language as "bn" | "en") || "bn";

  const [caseData, setCaseData] = useState<CaseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Decision form
  const [decision, setDecision] = useState<"confirmed_scam" | "not_scam" | "escalated" | "closed">("confirmed_scam");
  const [reason, setReason] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Notes & local draft autosave (R11, T26)
  const draftKey = `prohori_case_note_draft_${id}`;
  const [newNote, setNewNote] = useState(() => {
    return (id && typeof window !== "undefined" && localStorage.getItem(draftKey)) || "";
  });
  const [submittingNote, setSubmittingNote] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const fetchCase = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await casesApi.getCase(id);
      setCaseData(data);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setError(e.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // Autosave note draft (R11, T26)
  useEffect(() => {
    if (!id) return;
    if (newNote) {
      localStorage.setItem(draftKey, newNote);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [id, newNote, draftKey]);

  // Focus trap for modal
  useEffect(() => {
    if (confirmModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setConfirmModalOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [confirmModalOpen]);

  const handleDecisionSubmit = async () => {
    if (!caseData || !id) return;
    setSubmittingDecision(true);
    setConflictError(null);
    try {
      const updated = await casesApi.recordDecision(id, {
        decision,
        reason,
        version: caseData.version,
      });
      setCaseData(updated);
      setConfirmModalOpen(false);
      setReason("");
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        // Optimistic concurrency failure (R09, T18): preserve reason, prompt reload
        setConflictError(
          lang === "bn"
            ? "এই কেসটি অন্য একজন পর্যালোচক ইতিমধ্যে পরিবর্তন করেছেন। সর্বশেষ দেখতে রিলোড করুন (আপনার নোট অপরিবর্তিত রাখা হয়েছে)।"
            : "This case was updated by another reviewer. Please reload to see the latest changes (your reason was kept)."
        );
        setConfirmModalOpen(false);
      } else {
        alert(e.message || "Failed to record decision");
      }
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const noteObj = await casesApi.addNote(id, newNote.trim());
      setCaseData((prev) => (prev ? { ...prev, notes: [noteObj, ...prev.notes] } : null));
      setNewNote("");
      localStorage.removeItem(draftKey);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center p-12">
          <Icon icon="lucide:loader-2" className="w-8 h-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (error || !caseData) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div role="alert" className="p-6 rounded-lg bg-surface border border-status-danger/30 text-center">
          <p className="text-status-danger font-medium">{error || "Case not found"}</p>
          <Link to="/review" className="mt-4 inline-block text-primary hover:underline">
            {lang === "bn" ? "← রিভিউ ওভারভিউতে ফিরুন" : "← Back to Review Overview"}
          </Link>
        </div>
      </main>
    );
  }

  const { check, numbers, notes, timeline } = caseData;

  // Convert red flags to highlights format
  const highlights: HighlightItem[] = (check.red_flags || []).map((rf, idx) => {
    const text = check.masked_text || "";
    const start = text.indexOf(rf.quote);
    return {
      quote: rf.quote,
      flag: rf.flag,
      start: start >= 0 ? start : idx,
      end: start >= 0 ? start + rf.quote.length : idx + 1,
    };
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl font-body">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-text-muted">
          <li>
            <Link to="/review" className="hover:text-text focus-visible:ring-2 focus-visible:ring-primary rounded">
              {lang === "bn" ? "রিভিউ" : "Review"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-text">
            {caseData.reference}
          </li>
        </ol>
      </nav>

      {/* Case Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-text">{caseData.reference}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                caseData.status === "confirmed_scam"
                  ? "bg-status-danger/15 text-status-danger"
                  : caseData.status === "not_scam"
                    ? "bg-status-safe/15 text-status-safe"
                    : caseData.status === "new"
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-elevated text-text-muted"
              }`}
            >
              {caseData.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {lang === "bn" ? "রিপোর্ট দাখিলের সময়: " : "Reported: "}
            {formatDate(caseData.created_at, lang)}
          </p>
        </div>

        {caseData.decided_at && (
          <div className="text-right text-xs text-text-muted bg-surface-elevated p-2 rounded border border-border">
            <span className="font-medium text-text">{lang === "bn" ? "নিষ্পত্তি হয়েছে: " : "Decided: "}</span>
            {formatDate(caseData.decided_at, lang)}
            {caseData.decision_reason && (
              <p className="text-text-muted italic mt-0.5">"{caseData.decision_reason}"</p>
            )}
          </div>
        )}
      </header>

      {/* Conflict error banner (R09, T18) */}
      {conflictError && (
        <div role="alert" className="mb-6 p-4 rounded-lg bg-status-danger/10 border border-status-danger text-status-danger flex items-center justify-between">
          <p className="text-sm font-medium">{conflictError}</p>
          <Button variant="secondary" className="w-auto px-3 py-1" onClick={fetchCase}>
            {lang === "bn" ? "রিলোড করুন" : "Reload"}
          </Button>
        </div>
      )}

      {/* 8 + 4 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Reporter Note */}
          {caseData.reporter_note && (
            <section aria-labelledby="reporter-note-heading" className="p-4 rounded-lg bg-surface border border-border">
              <h2 id="reporter-note-heading" className="text-sm font-semibold text-text mb-1">
                {lang === "bn" ? "ব্যবহারকারীর মন্তব্য" : "Reporter Note"}
              </h2>
              <p className="text-sm text-text-muted">{caseData.reporter_note}</p>
            </section>
          )}

          {/* Masked Message / Scam Anatomy */}
          <section aria-labelledby="message-anatomy-heading" className="p-5 rounded-lg bg-surface border border-border">
            <h2 id="message-anatomy-heading" className="text-base font-semibold text-text mb-3">
              {lang === "bn" ? "বার্তা বিশ্লেষণ (মস্ক করা)" : "Message Analysis (Masked)"}
            </h2>
            <HighlightedMessage
              maskedText={check.masked_text || ""}
              highlights={highlights}
            />
          </section>

          {/* Assessment & Pipeline Rules */}
          <section aria-labelledby="assessment-heading" className="p-5 rounded-lg bg-surface border border-border">
            <h2 id="assessment-heading" className="text-base font-semibold text-text mb-3">
              {lang === "bn" ? "প্রহরীর মূল্যায়ন" : "Prohori Assessment"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="text-xs text-text-muted block">{lang === "bn" ? "ঝুঁকির মাত্রা" : "Risk Level"}</span>
                <span className="text-base font-bold text-text">{check.final_level || "Unavailable"}</span>
              </div>
              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="text-xs text-text-muted block">{lang === "bn" ? "রুট" : "Route"}</span>
                <span className="text-sm font-semibold text-text">{check.route || "rules_only"}</span>
              </div>
              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="text-xs text-text-muted block">{lang === "bn" ? "লেটেন্সি" : "Latency"}</span>
                <span className="text-sm font-semibold text-text">{check.latency_ms ? `${check.latency_ms} ms` : "N/A"}</span>
              </div>
              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="text-xs text-text-muted block">{lang === "bn" ? "ফলব্যাক ফ্ল্যাগ" : "Fallback"}</span>
                <span className="text-sm font-semibold text-text">{check.is_fallback ? "Yes" : "No"}</span>
              </div>
            </div>

            {/* Rule Hits */}
            {check.rule_hits && check.rule_hits.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  {lang === "bn" ? "নিয়মের মিল (Rule Hits)" : "Rule Hits"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {check.rule_hits.map((rule) => (
                    <span key={rule} className="px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reasons */}
            {check.reasons && check.reasons.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  {lang === "bn" ? "চিহ্নিত কারণসমূহ" : "Identified Reasons"}
                </span>
                <ul className="list-disc list-inside space-y-1 text-sm text-text-muted">
                  {check.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Numbers Table */}
          {numbers && numbers.length > 0 && (
            <section aria-labelledby="numbers-heading" className="p-5 rounded-lg bg-surface border border-border overflow-x-auto">
              <h2 id="numbers-heading" className="text-base font-semibold text-text mb-3">
                {lang === "bn" ? "সংযুক্ত নম্বরসমূহ" : "Associated Numbers"}
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th scope="col" className="pb-2 font-medium">{lang === "bn" ? "ভূমিকা" : "Role"}</th>
                    <th scope="col" className="pb-2 font-medium">{lang === "bn" ? "নম্বর" : "Number"}</th>
                    <th scope="col" className="pb-2 font-medium">{lang === "bn" ? "রিপোর্ট সংখ্যা" : "Reports"}</th>
                    <th scope="col" className="pb-2 font-medium">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {numbers.map((num, i) => (
                    <tr key={i}>
                      <td className="py-2.5 capitalize">{num.role}</td>
                      <td className="py-2.5 font-mono text-xs font-semibold">{num.masked_display}</td>
                      <td className="py-2.5">{num.report_count}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-text">
                          {num.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Right Column: 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Decision Panel */}
          <section
            aria-labelledby="decision-heading"
            className="p-5 rounded-lg bg-surface border-2 border-primary/30 shadow-sm"
          >
            <h2 id="decision-heading" className="text-base font-bold text-text mb-3 flex items-center gap-2">
              <Icon icon="lucide:shield-check" className="w-5 h-5 text-primary" />
              {lang === "bn" ? "সিদ্ধান্ত গ্রহণ" : "Record Decision"}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim().length >= 10) {
                  setConfirmModalOpen(true);
                }
              }}
              className="space-y-4"
            >
              <fieldset>
                <legend className="text-xs font-semibold text-text-muted mb-2">
                  {lang === "bn" ? "সিদ্ধান্তের ধরণ" : "Decision Type"}
                </legend>
                <div className="space-y-2">
                  {[
                    { id: "confirmed_scam", label_bn: "প্রতারণা নিশ্চিত (Confirmed Scam)", label_en: "Confirmed Scam" },
                    { id: "not_scam", label_bn: "প্রতারণা নয় (Not a Scam)", label_en: "Not a Scam" },
                    { id: "escalated", label_bn: "উর্ধ্বতন তদন্ত প্রয়োজন (Escalate)", label_en: "Escalate" },
                    { id: "closed", label_bn: "পদক্ষেপ ছাড়া বন্ধ (Close without Action)", label_en: "Close without Action" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer text-sm ${
                        decision === opt.id
                          ? "bg-primary/10 border-primary text-text font-medium"
                          : "border-border hover:bg-surface-elevated text-text-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value={opt.id}
                        checked={decision === opt.id}
                        onChange={() =>
                          setDecision(
                            opt.id as
                              | "confirmed_scam"
                              | "not_scam"
                              | "escalated"
                              | "closed"
                          )
                        }
                        className="text-primary focus:ring-primary"
                      />
                      <span>{lang === "bn" ? opt.label_bn : opt.label_en}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="decision-reason" className="block text-xs font-semibold text-text-muted mb-1">
                  {lang === "bn" ? "পর্যালোচকের কারণ (১০-৫০০ অক্ষর)" : "Reviewer Reason (10-500 chars)"} *
                </label>
                <textarea
                  id="decision-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={lang === "bn" ? "সিদ্ধান্তের যুক্তি লিখুন..." : "Enter rationale for decision..."}
                  className="w-full text-sm rounded border border-border bg-background p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  minLength={10}
                  maxLength={500}
                  required
                />
                <span className="text-xs text-text-muted block text-right mt-0.5">
                  {reason.length}/500 {reason.length < 10 && `(min 10)`}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={reason.trim().length < 10 || submittingDecision}
              >
                {lang === "bn" ? "সিদ্ধান্ত নিশ্চিত করুন" : "Confirm Decision"}
              </Button>
            </form>
          </section>

          {/* Notes Section with Autosave (R11, T26) */}
          <section aria-labelledby="notes-heading" className="p-5 rounded-lg bg-surface border border-border">
            <h2 id="notes-heading" className="text-base font-semibold text-text mb-3">
              {lang === "bn" ? "কেস নোট" : "Case Notes"}
            </h2>

            <form onSubmit={handleAddNote} className="mb-4">
              <label htmlFor="new-note-text" className="sr-only">
                {lang === "bn" ? "নতুন নোট" : "New Note"}
              </label>
              <textarea
                id="new-note-text"
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={lang === "bn" ? "নোট যোগ করুন (স্বয়ংক্রিয় খসড়া সংরক্ষিত হয়)..." : "Add a note (autosaved locally)..."}
                className="w-full text-sm rounded border border-border bg-background p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                maxLength={2000}
              />
              <div className="flex justify-end mt-1.5">
                <Button type="submit" variant="secondary" className="w-auto px-3 py-1" disabled={!newNote.trim() || submittingNote}>
                  {submittingNote ? "..." : lang === "bn" ? "নোট রাখুন" : "Add Note"}
                </Button>
              </div>
            </form>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-2">
                  {lang === "bn" ? "কোন নোট নেই" : "No notes yet"}
                </p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-2.5 rounded bg-surface-elevated border border-border text-xs">
                    <p className="text-text whitespace-pre-wrap">{n.note}</p>
                    <div className="flex items-center justify-between text-text-muted mt-1.5 pt-1 border-t border-border/50">
                      <span>{n.author_name || "Reviewer"}</span>
                      <span>{formatDate(n.created_at, lang)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Timeline Section */}
          <section aria-labelledby="timeline-heading" className="p-5 rounded-lg bg-surface border border-border">
            <h2 id="timeline-heading" className="text-base font-semibold text-text mb-3">
              {lang === "bn" ? "অডিট টাইমলাইন" : "Audit Timeline"}
            </h2>
            <div className="space-y-2 text-xs">
              {timeline.map((item) => (
                <div key={item.id} className="flex items-start gap-2 border-l-2 border-primary/40 pl-2.5 py-1">
                  <div>
                    <p className="font-semibold text-text">{item.action}</p>
                    <p className="text-text-muted">{formatDate(item.created_at, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal (WCAG Accessible dialog) */}
      {confirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            ref={modalRef}
            className="bg-surface rounded-xl border border-border max-w-md w-full p-6 shadow-xl space-y-4 focus:outline-none"
          >
            <h3 id="modal-title" className="text-lg font-bold font-heading text-text">
              {lang === "bn" ? "সিদ্ধান্ত রেকর্ড নিশ্চিত করুন" : "Confirm Decision Record"}
            </h3>
            <p className="text-sm text-text-muted">
              {lang === "bn"
                ? "এই পদক্ষেপটি আপনার সিদ্ধান্ত রেকর্ড করে এবং নম্বরের স্ট্যাটাস আপডেট করে। এটি কোনো ব্যবহারকারীকে স্বয়ংক্রিয়ভাবে ব্লক করে না।"
                : "This records your decision and updates the number's status. It does not block anyone."}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                className="w-auto px-4 py-2"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submittingDecision}
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                className="w-auto px-4 py-2"
                onClick={handleDecisionSubmit}
                disabled={submittingDecision}
              >
                {submittingDecision
                  ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                  : (lang === "bn" ? "নিশ্চিত" : "Confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
