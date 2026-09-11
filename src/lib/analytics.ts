const STORAGE_KEY = "pixelplay-session";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Fire-and-forget snapshot so PixelPro can see plans even without a lead form. */
export function trackPlan(event: string, payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    sessionId: sessionId(),
    event,
    ...payload,
    at: new Date().toISOString(),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through */
  }
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
