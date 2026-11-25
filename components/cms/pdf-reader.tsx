"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Moon,
  RotateCcw,
  ScrollText,
  Sun,
  SunDim,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type ReaderTheme = "light" | "sepia" | "dark";

interface StoredPdfState {
  lastPage: number;
  bookmarks: number[];
}

interface PdfReaderProps {
  url: string;
  title: string;
  onClose?: () => void;
  /** When true, renders inline inside an existing viewer shell (no fixed outer modal). */
  embedded?: boolean;
  allowDownload?: boolean;
}

const THEME_STORAGE_KEY = "ibemhal_pdf_theme_v1";
const BRIGHTNESS_STORAGE_KEY = "ibemhal_pdf_brightness_v1";

function getDocStorageKey(url: string) {
  return `ibemhal_pdf_doc_v1:${url.slice(0, 160)}`;
}

function readDocState(url: string): StoredPdfState {
  if (typeof window === "undefined") return { lastPage: 1, bookmarks: [] };
  try {
    const raw = localStorage.getItem(getDocStorageKey(url));
    if (!raw) return { lastPage: 1, bookmarks: [] };
    const parsed = JSON.parse(raw) as Partial<StoredPdfState>;
    return {
      lastPage: typeof parsed.lastPage === "number" && parsed.lastPage >= 1 ? parsed.lastPage : 1,
      bookmarks: Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks.filter((n): n is number => typeof n === "number" && n >= 1)
        : [],
    };
  } catch {
    return { lastPage: 1, bookmarks: [] };
  }
}

function writeDocState(url: string, state: StoredPdfState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getDocStorageKey(url), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

const THEME_CONFIG: Record<
  ReaderTheme,
  {
    label: string;
    outerBg: string;
    toolbarBg: string;
    toolbarText: string;
    cardBg: string;
    canvasFilter: string;
  }
> = {
  light: {
    label: "Day",
    outerBg: "bg-[#f3f1ec]",
    toolbarBg: "bg-white/95 border-slate-200 text-slate-900",
    toolbarText: "text-slate-700",
    cardBg: "bg-white",
    canvasFilter: "",
  },
  sepia: {
    label: "Kindle",
    outerBg: "bg-[#eadec7]",
    toolbarBg: "bg-[#f5ebd6]/95 border-[#dcc8a4] text-[#3d2c15]",
    toolbarText: "text-[#5c4322]",
    cardBg: "bg-[#fbf3e4]",
    canvasFilter: "sepia-[0.28] contrast-[0.97] brightness-[0.97]",
  },
  dark: {
    label: "Night",
    outerBg: "bg-[#090d16]",
    toolbarBg: "bg-[#0f172a]/95 border-white/10 text-slate-100",
    toolbarText: "text-slate-300",
    cardBg: "bg-[#151c2c]",
    canvasFilter: "invert-[0.88] hue-rotate-180 contrast-[0.94]",
  },
};

export function PdfReader({
  url,
  title,
  onClose,
  embedded = false,
  allowDownload = true,
}: PdfReaderProps) {
  const [theme, setTheme] = useState<ReaderTheme>("sepia");
  const [brightness, setBrightness] = useState<number>(95);
  const [zoom, setZoom] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fallbackIframe, setFallbackIframe] = useState(false);
  const [resumeToast, setResumeToast] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(820);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedZoomRef = useRef<Map<number, number>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const restoredScrollRef = useRef<boolean>(false);

  // Load persisted reader preferences
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ReaderTheme | null;
      if (savedTheme && (savedTheme === "light" || savedTheme === "sepia" || savedTheme === "dark")) {
        setTheme(savedTheme);
      }
      const savedBrightness = Number(localStorage.getItem(BRIGHTNESS_STORAGE_KEY));
      if (!Number.isNaN(savedBrightness) && savedBrightness >= 30 && savedBrightness <= 100) {
        setBrightness(savedBrightness);
      }
    } catch {
      // Ignore storage errors
    }
    const docState = readDocState(url);
    setCurrentPage(docState.lastPage);
    setBookmarks(docState.bookmarks);
    restoredScrollRef.current = false;
  }, [url]);

  const updateTheme = (next: ReaderTheme) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore
    }
  };

  const updateBrightness = (val: number) => {
    const clamped = Math.min(100, Math.max(30, val));
    setBrightness(clamped);
    try {
      localStorage.setItem(BRIGHTNESS_STORAGE_KEY, String(clamped));
    } catch {
      // Ignore
    }
  };

  // Measure viewport width for responsive Fit-to-Width baseline
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(Math.min(920, Math.max(280, w - 32)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load PDF document via pdfjs-dist
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    async function loadPdf() {
      setLoading(true);
      setFallbackIframe(false);
      setNumPages(0);
      renderedZoomRef.current.clear();
      renderingRef.current.clear();

      try {
        const pdfjs = await import("pdfjs-dist");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }
        loadingTask = pdfjs.getDocument({
          url,
          withCredentials: false,
        });
        const doc = await loadingTask.promise;
        if (cancelled) {
          doc.destroy?.();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        console.warn("PDF.js canvas fallback to native iframe:", err);
        if (!cancelled) {
          setFallbackIframe(true);
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
        pdfDocRef.current?.destroy?.();
      } catch {
        // Ignore cleanup errors
      }
      pdfDocRef.current = null;
    };
  }, [url]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      const doc = pdfDocRef.current;
      const canvas = canvasRefs.current.get(pageNum);
      if (!doc || !canvas) return;

      const targetKey = Number((zoom * containerWidth).toFixed(1));
      if (renderedZoomRef.current.get(pageNum) === targetKey || renderingRef.current.has(pageNum)) {
        return;
      }

      renderingRef.current.add(pageNum);
      try {
        const page = await doc.getPage(pageNum);
        const unscaled = page.getViewport({ scale: 1 });
        const baseScale = containerWidth / unscaled.width;
        const cssScale = baseScale * zoom;
        const dpr = Math.min(window.devicePixelRatio || 1, 2.25);

        const viewport = page.getViewport({ scale: cssScale });
        const renderViewport = page.getViewport({ scale: cssScale * dpr });

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport: renderViewport,
        }).promise;

        renderedZoomRef.current.set(pageNum, targetKey);
      } catch {
        // Ignore individual page render cancellation
      } finally {
        renderingRef.current.delete(pageNum);
      }
    },
    [containerWidth, zoom]
  );

  // Lazy-render visible pages & track current page while scrolling
  useEffect(() => {
    if (!numPages || fallbackIframe) return;
    const root = scrollRef.current;
    if (!root) return;

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const p = Number(entry.target.getAttribute("data-page"));
            if (p >= 1) void renderPage(p);
          }
        }
      },
      { root, rootMargin: "700px 0px" }
    );

    const visibleRatios = new Map<number, number>();
    const pageTracker = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const p = Number(entry.target.getAttribute("data-page"));
          if (p >= 1) visibleRatios.set(p, entry.intersectionRatio);
        }
        let bestPage = currentPage;
        let bestRatio = 0;
        visibleRatios.forEach((ratio, p) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = p;
          }
        });
        if (bestRatio > 0 && bestPage !== currentPage) {
          setCurrentPage(bestPage);
          writeDocState(url, { lastPage: bestPage, bookmarks });
        }
      },
      { root, threshold: [0.1, 0.35, 0.6, 0.85] }
    );

    pageRefs.current.forEach((el) => {
      renderObserver.observe(el);
      pageTracker.observe(el);
    });

    return () => {
      renderObserver.disconnect();
      pageTracker.disconnect();
    };
  }, [numPages, fallbackIframe, renderPage, url, bookmarks, currentPage]);

  // Re-render visible pages when zoom or containerWidth changes
  useEffect(() => {
    if (!numPages || fallbackIframe) return;
    renderedZoomRef.current.clear();
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(numPages, currentPage + 3);
    for (let p = start; p <= end; p++) {
      void renderPage(p);
    }
  }, [zoom, containerWidth, numPages, fallbackIframe, currentPage, renderPage]);

  // Auto-resume last read page once pages mount
  useEffect(() => {
    if (!numPages || fallbackIframe || restoredScrollRef.current) return;
    restoredScrollRef.current = true;
    const saved = readDocState(url).lastPage;
    if (saved > 1 && saved <= numPages) {
      const target = pageRefs.current.get(saved);
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          setResumeToast(saved);
          setTimeout(() => setResumeToast(null), 2600);
        });
      }
    }
  }, [numPages, fallbackIframe, url]);

  const jumpToPage = (pageNum: number) => {
    const clamped = Math.min(Math.max(1, pageNum), Math.max(1, numPages));
    setCurrentPage(clamped);
    writeDocState(url, { lastPage: clamped, bookmarks });
    const target = pageRefs.current.get(clamped);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleBookmark = () => {
    const exists = bookmarks.includes(currentPage);
    const next = exists
      ? bookmarks.filter((b) => b !== currentPage)
      : [...bookmarks, currentPage].sort((a, b) => a - b);
    setBookmarks(next);
    writeDocState(url, { lastPage: currentPage, bookmarks: next });
  };

  // Touch pinch-to-zoom handlers for mobile / tablet / APK
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartDistRef.current;
      const next = Math.min(2.5, Math.max(0.6, Number((pinchStartZoomRef.current * ratio).toFixed(2))));
      setZoom(next);
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const themeStyle = THEME_CONFIG[theme];
  const isBookmarked = bookmarks.includes(currentPage);
  const pageArray = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  const outerClass = embedded
    ? `relative flex h-full w-full flex-col overflow-hidden ${themeStyle.outerBg}`
    : `fixed inset-0 z-[120] flex flex-col overflow-hidden ${themeStyle.outerBg}`;

  return (
    <div className={outerClass}>
      {/* Standalone Modal Header (omitted when embedded inside StudentMaterialViewer) */}
      {!embedded && (
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#14256f] px-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close PDF Reader"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{title}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Ibemhal Kindle Reader
              </p>
            </div>
          </div>
          {allowDownload && (
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-bold hover:bg-white/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open</span>
              </a>
              <a
                href={url}
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#c37a26] px-3 text-xs font-bold text-white hover:bg-[#b06d20]"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          )}
        </header>
      )}

      {/* Kindle Comfort Toolbar */}
      <div
        className={`relative z-20 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur-md transition-colors sm:px-5 ${themeStyle.toolbarBg}`}
      >
        {/* Left: Page Counter + Prev/Next */}
        <div className="flex items-center gap-1.5">
          {!fallbackIframe && numPages > 0 ? (
            <>
              <button
                type="button"
                onClick={() => jumpToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-current/15 disabled:opacity-35"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[82px] text-center text-xs font-bold tabular-nums">
                Page {currentPage} / {numPages}
              </span>
              <button
                type="button"
                onClick={() => jumpToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="grid h-8 w-8 place-items-center rounded-lg border border-current/15 disabled:opacity-35"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold">
              <ScrollText className="h-4 w-4 text-[#c37a26]" />
              Kindle Reader
            </span>
          )}
        </div>

        {/* Center: Theme Switcher + Screen Dimmer */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center rounded-xl border border-current/15 p-0.5">
            <button
              type="button"
              onClick={() => updateTheme("light")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                theme === "light" ? "bg-[#14256f] text-white" : "opacity-75 hover:opacity-100"
              }`}
              title="Day Theme"
            >
              <Sun className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Day</span>
            </button>
            <button
              type="button"
              onClick={() => updateTheme("sepia")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                theme === "sepia" ? "bg-[#c37a26] text-white" : "opacity-75 hover:opacity-100"
              }`}
              title="Kindle Sepia Theme"
            >
              <ScrollText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Kindle</span>
            </button>
            <button
              type="button"
              onClick={() => updateTheme("dark")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                theme === "dark" ? "bg-slate-800 text-amber-300" : "opacity-75 hover:opacity-100"
              }`}
              title="Night Theme"
            >
              <Moon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Night</span>
            </button>
          </div>

          {/* Screen Dimmer Slider */}
          <label className="flex items-center gap-1.5 rounded-xl border border-current/15 px-2.5 py-1 text-[11px] font-bold">
            <SunDim className="h-4 w-4 shrink-0 text-[#c37a26]" />
            <span className="hidden lg:inline">Dimmer</span>
            <input
              type="range"
              min={30}
              max={100}
              value={brightness}
              onChange={(e) => updateBrightness(Number(e.target.value))}
              aria-label="Screen brightness dimmer"
              className="h-1.5 w-20 cursor-pointer accent-[#c37a26] sm:w-24"
            />
            <span className="w-8 text-right tabular-nums">{brightness}%</span>
          </label>
        </div>

        {/* Right: Zoom Controls & Bookmarks */}
        <div className="flex items-center gap-1.5">
          {!fallbackIframe && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-current/15"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-current/15 px-2 text-xs font-bold tabular-nums"
                title="Reset Zoom to Fit Width"
              >
                {Math.round(zoom * 100)}%
                {zoom !== 1 && <RotateCcw className="h-3 w-3 opacity-70" />}
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-current/15"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={toggleBookmark}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition ${
                  isBookmarked
                    ? "border-[#c37a26] bg-[#c37a26] text-white"
                    : "border-current/15 hover:bg-black/5"
                }`}
                title={isBookmarked ? "Remove page bookmark" : "Bookmark this page"}
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
              </button>

              {bookmarks.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBookmarks((v) => !v)}
                    className="inline-flex h-8 items-center rounded-lg border border-[#c37a26]/40 bg-[#c37a26]/10 px-2 text-xs font-bold text-[#c37a26]"
                  >
                    {bookmarks.length} ★
                  </button>
                  {showBookmarks && (
                    <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                      <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Bookmarked Pages
                      </p>
                      <div className="mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto">
                        {bookmarks.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              jumpToPage(p);
                              setShowBookmarks(false);
                            }}
                            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-bold hover:bg-amber-50"
                          >
                            <span>Page {p}</span>
                            <span className="text-[10px] text-[#c37a26]">Jump →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resume Toast */}
      {resumeToast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#14256f] px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          Resumed at Page {resumeToast}
        </div>
      )}

      {/* Reading Viewport with Screen Dimmer Filter */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ filter: `brightness(${brightness / 100})` }}
        className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[filter] duration-150 ${themeStyle.outerBg}`}
      >
        {loading && (
          <div className="grid h-full min-h-[320px] place-items-center p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#14256f]/20 border-t-[#c37a26]" />
              <p className={`text-sm font-bold ${themeStyle.toolbarText}`}>
                Preparing Kindle Reading View...
              </p>
            </div>
          </div>
        )}

        {!loading && fallbackIframe && (
          <iframe
            title={title}
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            className="h-full w-full border-0 bg-white"
          />
        )}

        {!loading && !fallbackIframe && (
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-3 py-5 sm:px-6">
            {pageArray.map((pageNum) => (
              <div
                key={pageNum}
                data-page={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
                className={`relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 ${themeStyle.cardBg}`}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el);
                    else canvasRefs.current.delete(pageNum);
                  }}
                  className={`block max-w-none transition-[filter] duration-150 ${themeStyle.canvasFilter}`}
                />
                <div className="flex items-center justify-between border-t border-black/5 px-3 py-1 text-[10px] font-bold opacity-60">
                  <span>
                    Page {pageNum} of {numPages}
                  </span>
                  {bookmarks.includes(pageNum) && (
                    <span className="text-[#c37a26]">★ Bookmarked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
