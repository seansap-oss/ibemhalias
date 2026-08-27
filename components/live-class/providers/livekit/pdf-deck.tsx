'use client';

import { useEffect, useRef, useState } from 'react';


export function PdfDeck({
  url,
  page,
  canControl,
  onPageChange,
  onPageCount,
}: {
  url: string;
  page: number;
  canControl: boolean;
  onPageChange: (page: number) => void;
  onPageCount?: (pages: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<any>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resizeTick, setResizeTick] = useState(0);
  const onPageCountRef = useRef(onPageCount);

  useEffect(() => { onPageCountRef.current = onPageCount; }, [onPageCount]);

  useEffect(() => {
    let cancelled = false;
    let loaded: any;
    let task: any;

    setDoc(null);
    setPages(0);
    setError('');
    setLoading(true);

    const load = async () => {
      try {
        // Load bytes first. This works for both local blob URLs and signed Supabase URLs
        // and avoids PDF.js trying to fetch the document through a separate worker request.
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`PDF download failed (${response.status}).`);
        const bytes = new Uint8Array(await response.arrayBuffer());

        // Load PDF.js from a stable public asset instead of a hot-reload webpack chunk.
        // This prevents the ChunkLoadError seen in Next.js dev mode.
        const pdfModuleUrl = '/vendor/pdfjs/pdf.mjs';
        const pdfjs: any = await import(/* webpackIgnore: true */ pdfModuleUrl);
        pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';

        task = pdfjs.getDocument({ data: bytes });
        loaded = await task.promise;

        if (!cancelled) {
          setDoc(loaded);
          setPages(loaded.numPages);
          onPageCountRef.current?.(loaded.numPages);
          setLoading(false);
        }
      } catch (firstError) {
        console.error('PDF render load failed', firstError);
        if (!cancelled) {
          setLoading(false);
          setError('Could not render this PDF. Use Open file to verify the source document.');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      task?.destroy?.();
      loaded?.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => setResizeTick((value) => value + 1));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current || !wrapRef.current) return;
    let cancelled = false;
    let renderTask: any;

    void (async () => {
      try {
        const safePage = Math.max(1, Math.min(page, doc.numPages));
        const pdfPage = await doc.getPage(safePage);
        if (cancelled || !canvasRef.current || !wrapRef.current) return;

        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        const base = pdfPage.getViewport({ scale: 1 });
        const maxW = Math.max(220, wrap.clientWidth || 900);
        const maxH = Math.max(180, wrap.clientHeight || 650);
        const scale = Math.max(0.1, Math.min(maxW / base.width, maxH / base.height) * 0.96);
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderTask = pdfPage.render({
          canvasContext: ctx,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
      } catch (renderError: any) {
        if (renderError?.name !== 'RenderingCancelledException') {
          console.error('PDF page render failed', renderError);
          if (!cancelled) setError('Could not render this PDF page.');
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [doc, page, resizeTick]);

  useEffect(() => {
    if (!canControl || !pages) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' && page > 1) {
        event.preventDefault();
        onPageChange(page - 1);
      }
      if (event.key === 'ArrowRight' && page < pages) {
        event.preventDefault();
        onPageChange(page + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canControl, onPageChange, page, pages]);

  if (loading) return <div className="stage-empty"><strong>Loading PDF...</strong></div>;
  if (error) return <div className="stage-empty"><strong>{error}</strong></div>;

  const shownPage = Math.max(1, Math.min(page, pages || page));

  return (
    <div ref={wrapRef} className="pdf-deck">
      <canvas ref={canvasRef} />
      <div className="pdf-page-pill" role="group" aria-label="PDF page controls">
        {canControl && (
          <button type="button" disabled={shownPage <= 1} onClick={() => onPageChange(shownPage - 1)} aria-label="Previous PDF page">‹</button>
        )}
        <span>{shownPage} / {pages || '…'}</span>
        {canControl && (
          <button type="button" disabled={!!pages && shownPage >= pages} onClick={() => onPageChange(shownPage + 1)} aria-label="Next PDF page">›</button>
        )}
      </div>
    </div>
  );
}
