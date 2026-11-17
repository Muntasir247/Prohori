import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: "case_decided" | "scam_alert" | "security_event" | string;
  payload: {
    case_id?: string;
    reference?: string;
    status?: string;
    title_bn?: string;
    title_en?: string;
    body_bn?: string;
    body_en?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  next_cursor: string | null;
}

export const notificationsApi = {
  list: (params?: { unread?: boolean; cursor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.unread) q.set("unread", "true");
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  markRead: (payload: { ids?: string[]; all?: boolean }) =>
    apiFetch<void>("/notifications/read", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export function useNotifications(enabled: boolean, unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly ? "unread" : "all"],
    queryFn: () => notificationsApi.list({ unread: unreadOnly }),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids?: string[]; all?: boolean }) =>
      notificationsApi.markRead(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
