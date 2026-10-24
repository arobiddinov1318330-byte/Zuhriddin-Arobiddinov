// Thin, safe wrapper around Telegram WebApp SDK; every call no-ops in a normal browser.
type TgWebApp = {
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string }; start_param?: string };
  HapticFeedback?: { notificationOccurred: (t: "success" | "error") => void; impactOccurred: (s: "light") => void };
  openTelegramLink?: (url: string) => void;
  setHeaderColor?: (c: string) => void;
};

export function tg(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  const w = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
  return w && w.initDataUnsafe !== undefined ? w : null;
}

export function initTelegram() {
  const w = tg();
  try {
    w?.ready();
    w?.expand();
  } catch {}
  return w;
}

export const haptic = (ok: boolean) => {
  try {
    tg()?.HapticFeedback?.notificationOccurred(ok ? "success" : "error");
  } catch {}
};

export async function shareText(text: string, url = typeof window !== "undefined" ? window.location.origin : "") {
  const w = tg();
  if (w?.openTelegramLink) {
    w.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return;
    } catch {}
  }
  await navigator.clipboard?.writeText(`${text} ${url}`);
}
