/**
 * Registro do service worker apenas em produção real.
 * Nunca registra no preview do Lovable, em iframe ou em dev.
 */
const BLOCKED_SUFFIXES = [
  ".lovableproject.com",
  ".lovableproject-dev.com",
  ".beta.lovable.dev",
];
const BLOCKED_HOSTS = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];

function isBlockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const { hostname, search } = window.location;
  if (new URLSearchParams(search).has("sw") && new URLSearchParams(search).get("sw") === "off")
    return true;
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (BLOCKED_HOSTS.includes(hostname)) return true;
  if (BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) return true;
  return false;
}

async function unregisterAppWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes("/sw.js"))
      .map((r) => r.unregister()),
  );
}

export function registerPWA() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    void unregisterAppWorkers();
    return;
  }
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    /* ignora falha de registro */
  });
}
