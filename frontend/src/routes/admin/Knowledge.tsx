import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppShell } from "@/components/AppShell";
import { adminApi, KbDocument } from "@/features/admin/api";

const SCAM_TYPES = [
  { id: 1, name: "Fake Lottery / Prize" },
  { id: 2, name: "Provider Impersonation" },
  { id: 3, name: "Account Block Threat" },
  { id: 4, name: "Fake Job / Task Offer" },
  { id: 5, name: "Emergency Family Help" },
  { id: 6, name: "Loan Advance Fee" },
  { id: 7, name: "OTP / PIN Phishing" },
  { id: 8, name: "E-commerce Delivery Scam" },
  { id: 9, name: "Investment / Crypto Double" },
  { id: 10, name: "Government Aid Grant" },
];

export default function AdminKnowledge() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filters
  const [scamType, setScamType] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Modals & Active Document
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KbDocument | null>(null);
  const [viewingChunksDoc, setViewingChunksDoc] = useState<KbDocument | null>(null);
  const [publishError, setPublishError] = useState<{ id: string; message: string } | null>(null);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formScamTypeId, setFormScamTypeId] = useState<number>(1);
  const [formLanguage, setFormLanguage] = useState("bn");
  const [formSourceUrl, setFormSourceUrl] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Query documents
  const {
    data: documents = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-knowledge", scamType, language, status, search],
    queryFn: () =>
      adminApi.listKnowledge({
        scam_type: scamType || undefined,
        language: language || undefined,
        status: status || undefined,
        search: search || undefined,
      }),
  });


  // Create or Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (editingDoc) {
        return adminApi.updateKnowledge(editingDoc.id, {
          title: formTitle,
          scam_type_id: formScamTypeId,
          language: formLanguage,
          source_url: formSourceUrl || undefined,
          body: formBody,
        });
      } else {
        return adminApi.createKnowledge({
          code: formCode.trim().toUpperCase(),
          title: formTitle,
          scam_type_id: formScamTypeId,
          language: formLanguage,
          source_url: formSourceUrl || undefined,
          body: formBody,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge"] });
      closeModal();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to save document");
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      setPublishError(null);
      return adminApi.publishKnowledge(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge"] });
    },
    onError: (err: Error, id: string) => {
      setPublishError({
        id,
        message: err.message || "Publishing and embedding failed. Status kept as Draft.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge"] });
    },
  });

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormCode(`KB-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormTitle("");
    setFormScamTypeId(1);
    setFormLanguage("bn");
    setFormSourceUrl("");
    setFormBody("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: KbDocument) => {
    setEditingDoc(doc);
    setFormCode(doc.code);
    setFormTitle(doc.title);
    setFormScamTypeId(doc.scam_type_id);
    setFormLanguage(doc.language);
    setFormSourceUrl(doc.source_url || "");
    setFormBody(doc.body);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
    setFormError(null);
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <AdminNav
          lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />

        {/* Header with Title and New Pattern button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {t("admin.knowledge_title", "Knowledge Base (S30)")}
            </h1>
            <p className="text-sm text-muted">
              {t(
                "admin.knowledge_subtitle",
                "Manage verified scam-pattern documents. Publishing automatically chunks and embeds patterns into the vector store.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover transition-colors"
          >
            <Icon icon="ph:plus-bold" className="h-4 w-4" />
            <span>{t("admin.new_pattern", "New Pattern")}</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="relative min-w-[200px] flex-1">
            <Icon
              icon="ph:magnifying-glass"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.search_patterns", "Search title or code…")}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-text placeholder-muted focus:border-brand focus:outline-none"
            />
          </div>

          <select
            value={scamType}
            onChange={(e) => setScamType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-brand focus:outline-none"
          >
            <option value="">{t("admin.all_scam_types", "All Scam Types")}</option>
            {SCAM_TYPES.map((st) => (
              <option key={st.id} value={String(st.id)}>
                {st.name}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-brand focus:outline-none"
          >
            <option value="">{t("admin.all_languages", "All Languages")}</option>
            <option value="bn">Bangla (bn)</option>
            <option value="en">English (en)</option>
            <option value="banglish">Banglish</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-brand focus:outline-none"
          >
            <option value="">{t("admin.all_statuses", "All Statuses")}</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Publishing error alert if any */}
        {publishError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <Icon icon="ph:warning-circle" className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Publishing Error:</span> {publishError.message}
            </div>
            <button
              type="button"
              onClick={() => setPublishError(null)}
              className="text-muted hover:text-text"
            >
              <Icon icon="ph:x" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted">
              <Icon icon="ph:spinner" className="h-5 w-5 animate-spin text-brand" />
              <span>Loading patterns…</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Icon icon="ph:books" className="h-12 w-12 text-muted/60" />
              <div className="space-y-1">
                <p className="font-semibold text-text">No scam patterns found</p>
                <p className="text-sm text-muted">
                  Add your first scam pattern to enrich the knowledge base and retrieval engine.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                <Icon icon="ph:plus" className="h-4 w-4" />
                <span>Add first pattern</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="border-b border-border bg-background/50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Title & Source</th>
                    <th className="px-4 py-3">Scam Type</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chunks</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => {
                    const hasFailedPublish = publishError?.id === doc.id;
                    const isPublished = doc.status === "Published";

                    return (
                      <tr key={doc.id} className="hover:bg-background/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand">{doc.code}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text">{doc.title}</div>
                          {doc.source_url && (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted hover:text-brand inline-flex items-center gap-1"
                            >
                              <span>{doc.source_url}</span>
                              <Icon icon="ph:arrow-square-out" className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {doc.scam_type_name || `Type #${doc.scam_type_id}`}
                        </td>
                        <td className="px-4 py-3 uppercase text-xs font-semibold tracking-wider text-muted">
                          {doc.language}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isPublished
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : hasFailedPublish
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isPublished
                                  ? "bg-emerald-500"
                                  : hasFailedPublish
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {hasFailedPublish ? "Draft (Retry)" : doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setViewingChunksDoc(doc)}
                            className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand font-mono"
                          >
                            <Icon icon="ph:puzzle-piece" className="h-3.5 w-3.5" />
                            <span>{doc.chunk_count} chunks</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(doc)}
                              className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text transition-colors"
                              title="Edit pattern"
                            >
                              <Icon icon="ph:pencil-simple" className="h-4 w-4" />
                            </button>

                            {(!isPublished || hasFailedPublish) && (
                              <button
                                type="button"
                                disabled={publishMutation.isPending}
                                onClick={() => publishMutation.mutate(doc.id)}
                                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                                  hasFailedPublish
                                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30"
                                    : "bg-brand/10 text-brand hover:bg-brand/20"
                                }`}
                              >
                                {publishMutation.isPending &&
                                publishMutation.variables === doc.id ? (
                                  <Icon icon="ph:spinner" className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Icon icon="ph:arrow-clockwise" className="h-3.5 w-3.5" />
                                )}
                                <span>{hasFailedPublish ? "Retry" : "Publish"}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-text">
                  {editingDoc ? "Edit Scam Pattern" : "New Scam Pattern"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="mt-4 space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Document Code</label>
                    <input
                      type="text"
                      disabled={!!editingDoc}
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      required
                      maxLength={12}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Scam Category</label>
                    <select
                      value={formScamTypeId}
                      onChange={(e) => setFormScamTypeId(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    >
                      {SCAM_TYPES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">Title (English or Bangla)</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    maxLength={160}
                    placeholder="e.g. Fake Lottery SMS with verification OTP request"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Language</label>
                    <select
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    >
                      <option value="bn">Bangla (bn)</option>
                      <option value="en">English (en)</option>
                      <option value="banglish">Banglish</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted">Source URL (optional)</label>
                    <input
                      type="url"
                      value={formSourceUrl}
                      onChange={(e) => setFormSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">Pattern Body & Examples</label>
                  <textarea
                    rows={6}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    required
                    placeholder="Paste the pattern description, common phrases used by scammers, fake helplines, or representative SMS transcripts..."
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Publishing will automatically segment this content into 200–400 token chunks with 40-token overlap.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saveMutation.isPending && (
                      <Icon icon="ph:spinner" className="h-4 w-4 animate-spin" />
                    )}
                    <span>{editingDoc ? "Save Changes" : "Create Pattern"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Chunks Modal */}
        {viewingChunksDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-text">
                    Chunks for {viewingChunksDoc.code}
                  </h3>
                  <p className="text-xs text-muted">{viewingChunksDoc.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingChunksDoc(null)}
                  className="rounded p-1 text-muted hover:text-text"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                {viewingChunksDoc.chunk_count === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">
                    No chunks generated yet. Click "Publish" to chunk and embed this document.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">
                      This pattern has {viewingChunksDoc.chunk_count} chunks indexed in the vector retrieval engine.
                    </p>
                    <div className="rounded-lg border border-border bg-background p-3 text-xs font-mono text-text">
                      {viewingChunksDoc.body}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setViewingChunksDoc(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
