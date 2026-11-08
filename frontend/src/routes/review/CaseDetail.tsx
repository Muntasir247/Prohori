import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

import { AppShell } from "@/components/AppShell";
import { ReviewNav } from "@/components/review/ReviewNav";
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
      <AppShell>
        <div className="mx-auto max-w-6xl py-16 text-center text-muted">
          <Icon icon="ph:spinner" className="mx-auto text-3xl animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  if (error || !caseData) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-12">
          <div className="rounded-2xl border border-risk-high/30 bg-risk-high/10 p-6 text-center">
            <Icon icon="ph:warning-circle" className="mx-auto text-3xl text-risk-high mb-2" />
            <p className="text-sm font-semibold text-risk-high">{error || "Case not found"}</p>
            <Link
              to="/review/cases"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              {lang === "bn" ? "← কেস তালিকায় ফিরুন" : "← Back to Case Queue"}
            </Link>
          </div>
        </div>
      </AppShell>
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
    <AppShell>
      <div className="mx-auto max-w-6xl py-6 flex flex-col gap-6">
        <ReviewNav />

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="-mt-2">
          <ol className="flex items-center space-x-2 text-xs text-muted">
            <li>
              <Link to="/review" className="hover:text-text transition-colors">
                {lang === "bn" ? "রিভিউ" : "Review"}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/review/cases" className="hover:text-text transition-colors">
                {lang === "bn" ? "কেস তালিকা" : "Cases"}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-mono font-semibold text-brand">
              {caseData.reference}
            </li>
          </ol>
        </nav>

        {/* Case Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/70 p-5 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-text">
                {caseData.reference}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider ${
                  caseData.status === "confirmed_scam"
                    ? "bg-risk-high/15 text-risk-high border border-risk-high/30"
                    : caseData.status === "not_scam"
                      ? "bg-success/15 text-success border border-success/30"
                      : caseData.status === "new"
                        ? "bg-brand/15 text-brand border border-brand/30"
                        : "bg-surface-2 text-muted border border-border"
                }`}
              >
                {caseData.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-2xs text-muted mt-1.5 flex items-center gap-1.5 font-mono">
              <Icon icon="ph:clock" />
              <span>{lang === "bn" ? "রিপোর্ট দাখিলের সময়: " : "Reported: "}</span>
              <span>{formatDate(caseData.created_at, lang)}</span>
            </p>
          </div>

          {caseData.decided_at && (
            <div className="text-right text-xs bg-surface-2/60 p-3 rounded-xl border border-border/70">
              <span className="font-semibold text-text">{lang === "bn" ? "নিষ্পত্তি হয়েছে: " : "Decided: "}</span>
              <span className="text-muted font-mono">{formatDate(caseData.decided_at, lang)}</span>
              {caseData.decision_reason && (
                <p className="text-2xs text-muted italic mt-1">"{caseData.decision_reason}"</p>
              )}
            </div>
          )}
        </header>

        {/* Conflict error banner (R09, T18) */}
        {conflictError && (
          <div role="alert" className="p-4 rounded-xl bg-risk-high/10 border border-risk-high/30 text-risk-high flex items-center justify-between">
            <p className="text-xs font-semibold">{conflictError}</p>
            <Button variant="secondary" className="w-auto px-3 py-1 text-xs" onClick={fetchCase}>
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
              <section aria-labelledby="reporter-note-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70">
                <h2 id="reporter-note-heading" className="text-2xs text-muted mb-2 font-semibold">
                  {lang === "bn" ? "ব্যবহারকারীর মন্তব্য" : "Reporter Note"}
                </h2>
                <p className="text-xs text-text leading-relaxed bg-surface-2/40 p-3 rounded-xl border border-border/50">
                  {caseData.reporter_note}
                </p>
              </section>
            )}

            {/* Masked Message / Scam Anatomy */}
            <section aria-labelledby="message-anatomy-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70 backdrop-blur-md">
              <h2 id="message-anatomy-heading" className="text-2xs text-muted mb-3 font-semibold">
                {lang === "bn" ? "বার্তা বিশ্লেষণ (মস্ক করা)" : "Message Analysis (Masked)"}
              </h2>
              <HighlightedMessage
                maskedText={check.masked_text || ""}
                highlights={highlights}
              />
            </section>

            {/* Assessment & Pipeline Rules */}
            <section aria-labelledby="assessment-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70 backdrop-blur-md">
              <h2 id="assessment-heading" className="text-2xs text-muted mb-3 font-semibold">
                {lang === "bn" ? "প্রহরীর মূল্যায়ন" : "Prohori Assessment"}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60">
                  <span className="text-2xs text-muted block mb-0.5">{lang === "bn" ? "ঝুঁকির মাত্রা" : "Risk Level"}</span>
                  <span className="text-sm font-bold text-text">{check.final_level || "Unavailable"}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60">
                  <span className="text-2xs text-muted block mb-0.5">{lang === "bn" ? "রুট" : "Route"}</span>
                  <span className="text-xs font-mono font-semibold text-text">{check.route || "rules_only"}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60">
                  <span className="text-2xs text-muted block mb-0.5">{lang === "bn" ? "লেটেন্সি" : "Latency"}</span>
                  <span className="text-xs font-mono font-semibold text-text">{check.latency_ms ? `${check.latency_ms} ms` : "N/A"}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2/60 border border-border/60">
                  <span className="text-2xs text-muted block mb-0.5">{lang === "bn" ? "ফলব্যাক ফ্ল্যাগ" : "Fallback"}</span>
                  <span className="text-xs font-semibold text-text">{check.is_fallback ? "Yes" : "No"}</span>
                </div>
              </div>

              {/* Rule Hits */}
              {check.rule_hits && check.rule_hits.length > 0 && (
                <div className="mb-4">
                  <span className="text-2xs text-muted block mb-2 font-semibold">
                    {lang === "bn" ? "নিয়মের মিল (Rule Hits)" : "Rule Hits"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {check.rule_hits.map((rule) => (
                      <span key={rule} className="px-2.5 py-1 rounded-lg text-2xs font-mono font-semibold bg-brand/10 text-brand border border-brand/20">
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasons */}
              {check.reasons && check.reasons.length > 0 && (
                <div>
                  <span className="text-2xs text-muted block mb-2 font-semibold">
                    {lang === "bn" ? "চিহ্নিত কারণসমূহ" : "Identified Reasons"}
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted">
                    {check.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-brand font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Numbers Table */}
            {numbers && numbers.length > 0 && (
              <section aria-labelledby="numbers-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70 overflow-x-auto">
                <h2 id="numbers-heading" className="text-2xs text-muted mb-3 font-semibold">
                  {lang === "bn" ? "সংযুক্ত নম্বরসমূহ" : "Associated Numbers"}
                </h2>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-2xs text-muted font-semibold">
                      <th scope="col" className="pb-2.5 font-semibold">{lang === "bn" ? "ভূমিকা" : "Role"}</th>
                      <th scope="col" className="pb-2.5 font-semibold">{lang === "bn" ? "নম্বর" : "Number"}</th>
                      <th scope="col" className="pb-2.5 font-semibold">{lang === "bn" ? "রিপোর্ট সংখ্যা" : "Reports"}</th>
                      <th scope="col" className="pb-2.5 font-semibold">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {numbers.map((num, i) => (
                      <tr key={i} className="hover:bg-surface-2/30">
                        <td className="py-3 capitalize font-medium text-text">{num.role}</td>
                        <td className="py-3 font-mono text-xs font-semibold text-text">{num.masked_display}</td>
                        <td className="py-3 font-mono text-muted">{num.report_count}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-surface-2 border border-border text-text">
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
              className="p-5 rounded-2xl bg-surface/90 border border-brand/30 shadow-lg shadow-brand/5 relative overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"
              />
              <h2 id="decision-heading" className="font-display text-sm font-bold text-text mb-4 flex items-center gap-2">
                <Icon icon="ph:lock-simple" className="w-5 h-5 text-brand" />
                <span>{lang === "bn" ? "সিদ্ধান্ত গ্রহণ" : "Record Decision"}</span>
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
                  <legend className="text-2xs text-muted mb-2.5 font-semibold">
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
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                          decision === opt.id
                            ? "bg-brand/10 border-brand/50 text-text font-bold shadow-sm"
                            : "border-border/70 hover:bg-surface-2/60 text-muted"
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
                          className="accent-brand"
                        />
                        <span>{lang === "bn" ? opt.label_bn : opt.label_en}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="decision-reason" className="block text-2xs text-muted mb-1.5 font-semibold">
                    {lang === "bn" ? "পর্যালোচকের কারণ (১০-৫০০ অক্ষর)" : "Reviewer Reason (10-500 chars)"} *
                  </label>
                  <textarea
                    id="decision-reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={lang === "bn" ? "সিদ্ধান্তের যুক্তি লিখুন..." : "Enter rationale for decision..."}
                    className="w-full text-xs rounded-xl border border-border/80 bg-surface/60 p-3 text-text placeholder:text-faint focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                    minLength={10}
                    maxLength={500}
                    required
                  />
                  <span className="text-2xs text-muted block text-right mt-1 font-mono">
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
            <section aria-labelledby="notes-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70">
              <div className="flex items-center justify-between mb-3">
                <h2 id="notes-heading" className="font-display text-sm font-bold text-text">
                  {lang === "bn" ? "কেস নোট" : "Case Notes"}
                </h2>
                {newNote && (
                  <span className="text-2xs text-brand font-mono flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    Draft saved
                  </span>
                )}
              </div>

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
                  className="w-full text-xs rounded-xl border border-border/80 bg-surface/60 p-3 text-text placeholder:text-faint focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  maxLength={2000}
                />
                <div className="flex justify-end mt-2">
                  <Button type="submit" variant="secondary" className="w-auto px-3.5 py-1.5 text-2xs" disabled={!newNote.trim() || submittingNote}>
                    {submittingNote ? "..." : lang === "bn" ? "নোট রাখুন" : "Add Note"}
                  </Button>
                </div>
              </form>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <p className="text-2xs text-muted text-center py-3">
                    {lang === "bn" ? "কোন নোট নেই" : "No notes yet"}
                  </p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-surface-2/60 border border-border/60 text-xs">
                      <p className="text-text whitespace-pre-wrap leading-relaxed">{n.note}</p>
                      <div className="flex items-center justify-between text-2xs text-muted mt-2 pt-1.5 border-t border-border/40 font-mono">
                        <span>{n.author_name || "Reviewer"}</span>
                        <span>{formatDate(n.created_at, lang)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Timeline Section */}
            <section aria-labelledby="timeline-heading" className="p-5 rounded-2xl bg-surface/80 border border-border/70">
              <h2 id="timeline-heading" className="font-display text-sm font-bold text-text mb-3">
                {lang === "bn" ? "অডিট টাইমলাইন" : "Audit Timeline"}
              </h2>
              <div className="space-y-2 text-xs">
                {timeline.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 border-l-2 border-brand/50 pl-3 py-1">
                    <div>
                      <p className="font-semibold text-text text-2xs">{item.action}</p>
                      <p className="text-2xs text-muted font-mono">{formatDate(item.created_at, lang)}</p>
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
            className="modal-overlay fixed inset-0 z-50 bg-raat/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              ref={modalRef}
              className="bg-surface/95 rounded-3xl border border-border/80 max-w-md w-full p-6 shadow-2xl space-y-4 focus:outline-none backdrop-blur-xl relative"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent"
              />
              <h3 id="modal-title" className="font-display text-lg font-bold text-text">
                {lang === "bn" ? "সিদ্ধান্ত রেকর্ড নিশ্চিত করুন" : "Confirm Decision Record"}
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">
                {lang === "bn"
                  ? "এই পদক্ষেপটি আপনার সিদ্ধান্ত রেকর্ড করে এবং নম্বরের স্ট্যাটাস আপডেট করে। এটি কোনো ব্যবহারকারীকে স্বয়ংক্রিয়ভাবে ব্লক করে না।"
                  : "This records your decision and updates the number's status. It does not block anyone."}
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="ghost"
                  className="w-auto px-4 py-2 text-xs"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={submittingDecision}
                >
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  className="w-auto px-4 py-2 text-xs"
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
      </div>
    </AppShell>
  );
}
