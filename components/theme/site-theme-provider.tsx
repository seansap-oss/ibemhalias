"use client";

import * as React from "react";

export type SiteTheme = "classic" | "premium";

type SiteThemeContextValue = {
  theme: SiteTheme;
  ready: boolean;
  refresh: () => Promise<void>;
};

const SiteThemeContext = React.createContext<SiteThemeContextValue>({
  theme: "classic",
  ready: false,
  refresh: async () => {},
});

const CACHE_KEY = "ibemhal-site-theme-v1";
const EVENT_NAME = "ibemhal-site-theme-changed";

function normalizeTheme(value: unknown): SiteTheme {
  return value === "premium" ? "premium" : "classic";
}

function applyTheme(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.siteTheme = theme;
  document.documentElement.classList.toggle("ibemhal-premium-theme", theme === "premium");
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<SiteTheme>("classic");
  const [ready, setReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch("/api/site-theme", { cache: "no-store" });
      const payload = response.ok ? await response.json() : { theme: "classic" };
      const next = normalizeTheme(payload?.theme);
      setTheme(next);
      applyTheme(next);
      try { window.localStorage.setItem(CACHE_KEY, next); } catch {}
    } catch {
      // Keep the last known value; Classic is the safe first-run fallback.
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    try {
      const cached = normalizeTheme(window.localStorage.getItem(CACHE_KEY));
      setTheme(cached);
      applyTheme(cached);
    } catch {
      applyTheme("classic");
    }

    void refresh();

    const onThemeChanged = (event: Event) => {
      const custom = event as CustomEvent<{ theme?: SiteTheme }>;
      const next = normalizeTheme(custom.detail?.theme);
      setTheme(next);
      applyTheme(next);
      try { window.localStorage.setItem(CACHE_KEY, next); } catch {}
    };

    window.addEventListener(EVENT_NAME, onThemeChanged);
    return () => window.removeEventListener(EVENT_NAME, onThemeChanged);
  }, [refresh]);

  const value = React.useMemo(() => ({ theme, ready, refresh }), [theme, ready, refresh]);

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme() {
  return React.useContext(SiteThemeContext);
}

export function broadcastSiteTheme(theme: SiteTheme) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { theme } }));
}
