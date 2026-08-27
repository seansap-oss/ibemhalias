'use client';

import { PointerEvent, useEffect, useRef, useState } from 'react';
import type { Point, Stroke } from '@/lib/live-class/providers/livekit-types';

export function Whiteboard({
  strokes,
  canDraw,
  transparent = false,
  onStroke,
  onClear,
}: {
  strokes: Stroke[];
  canDraw: boolean;
  transparent?: boolean;
  onStroke: (stroke: Stroke) => void;
  onClear: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState<Point[]>([]);
  const [pen, setPen] = useState('#ffb020');

  function redraw(extra?: Point[]) {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * rect.width, p.y * rect.height);
      ctx.stroke();
    };
    strokes.forEach(drawStroke);
    if (extra && extra.length > 1) drawStroke({ id: 'active', points: extra, width: 3, color: pen });
  }

  useEffect(() => {
    redraw(active);
    const observer = new ResizeObserver(() => redraw(active));
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [strokes, active, pen]);

  function point(e: PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function down(e: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive([point(e)]);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const p = point(e);
    setActive((old) => [...old, p]);
  }

  function up(e: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || active.length < 2) { setActive([]); return; }
    const final = [...active, point(e)];
    onStroke({ id: crypto.randomUUID(), points: final, width: 3, color: pen });
    setActive([]);
  }

  return (
    <div ref={wrapRef} className={`whiteboard ${transparent ? 'transparent' : ''} ${canDraw ? 'interactive' : 'readonly'}`}>
      <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setActive([])} />
      {canDraw && (
        <div className="whiteboard-tools">
          <button type="button" className={pen === '#ffb020' ? 'selected' : ''} onClick={() => setPen('#ffb020')} aria-label="Amber pen">●</button>
          <button type="button" className={pen === '#34d399' ? 'selected green' : 'green'} onClick={() => setPen('#34d399')} aria-label="Green pen">●</button>
          <button type="button" className={pen === '#60a5fa' ? 'selected blue' : 'blue'} onClick={() => setPen('#60a5fa')} aria-label="Blue pen">●</button>
          <button type="button" onClick={onClear}>Clear</button>
        </div>
      )}
    </div>
  );
}
