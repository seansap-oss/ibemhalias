"use client";

import * as React from "react";
import { MoonStar, SunMedium, Sparkles } from "lucide-react";

type MockTheme = "light" | "premium";
const KEY = "ibemhal-mock-theme-v1";

export function LmsMockTheme({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<MockTheme>("light");

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "light" || saved === "premium") setTheme(saved);
    } catch {}
  }, []);

  const choose = (next: MockTheme) => {
    setTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch {}
  };

  return (
    <div className={`lms-mock ${theme === "premium" ? "lms-mock--premium" : "lms-mock--light"}`}>
      <div className="lms-mock-themebar">
        <div className="lms-mock-themecopy">
          <Sparkles className="h-4 w-4" />
          <span>Mock Test Workspace</span>
        </div>
        <div className="lms-mock-themebuttons" aria-label="Mock Test appearance">
          <button type="button" className={theme === "light" ? "active" : ""} onClick={() => choose("light")}>
            <SunMedium className="h-3.5 w-3.5" /> Light
          </button>
          <button type="button" className={theme === "premium" ? "active" : ""} onClick={() => choose("premium")}>
            <MoonStar className="h-3.5 w-3.5" /> Premium
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
