import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export interface HealthResult {
  status: "ok" | "degraded";
  database: "up" | "down";
  version: string;
}

// Fetches GET /api/v1/health. The backend returns 503 with a body when the
// database is down; apiFetch turns that into a thrown ApiError, which the query
// surfaces as `isError` so the home screen can show the degraded state.
export function useHealth() {
  return useQuery<HealthResult>({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResult>("/health"),
  });
}
