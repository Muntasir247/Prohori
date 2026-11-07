// Thin fetch wrapper. Sends cookies, tags requests with X-Requested-With (the
// backend's CSRF signal), and parses the standard error envelope from Doc 02
// Section 7 so callers get a typed ApiError.

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message_key: string;
    fields: Record<string, string>;
    request_id: string;
    retry_after?: number;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly messageKey: string;
  readonly fields: Record<string, string>;
  readonly requestId?: string;
  readonly retryAfter?: number;

  constructor(status: number, envelope?: ApiErrorEnvelope) {
    super(envelope?.error.code ?? `http_${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = envelope?.error.code ?? `http_${status}`;
    this.messageKey = envelope?.error.message_key ?? "errors.unknown";
    this.fields = envelope?.error.fields ?? {};
    this.requestId = envelope?.error.request_id;
    this.retryAfter = envelope?.error.retry_after;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      "X-Requested-With": "prohori",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let envelope: ApiErrorEnvelope | undefined;
    try {
      envelope = (await res.json()) as ApiErrorEnvelope;
    } catch {
      envelope = undefined;
    }
    throw new ApiError(res.status, envelope);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
