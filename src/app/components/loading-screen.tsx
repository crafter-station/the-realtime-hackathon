"use client";

import { useEffect, useRef, useState } from "react";

const LABEL = "Ready?";
const ORANGE: [number, number, number] = [255, 77, 0];
const CHAR_MS = 160;
const MIN_DURATION = 2600;
const MAX_DURATION = 4200;
const FADE_MS = 620;

type Grid = {
  cells: boolean[][];
  rows: number;
  cols: number;
  /** Trimmed end column after each character, for a typewriter reveal. */
  charEndCols: number[];
};

/**
 * Sample the pixel font into a low-resolution on/off matrix so the loading
 * label reads like an LED dot-matrix panel. The Geist Pixel font is already
 * blocky, so sampling its coverage yields clean square cells.
 */
function buildGrid(text: string, fontFamily: string, targetRows: number): Grid {
  const off = document.createElement("canvas");
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) return { cells: [], rows: 0, cols: 0, charEndCols: [] };

  const fontSize = 220;
  const font = `700 ${fontSize}px ${fontFamily}`;
  octx.font = font;
  const metrics = octx.measureText(text);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.72);
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.2);
  const pad = 6;
  const width = Math.ceil(metrics.width) + pad * 2;
  const height = ascent + descent + pad * 2;

  off.width = width;
  off.height = height;
  octx.font = font;
  octx.textBaseline = "alphabetic";
  octx.fillStyle = "#ffffff";
  octx.fillText(text, pad, ascent + pad);

  const textHeight = ascent + descent;
  const step = textHeight / targetRows;
  const cols = Math.round(width / step);
  const rows = Math.round(height / step);
  const data = octx.getImageData(0, 0, width, height).data;

  // Cumulative end column of each character, for the typewriter reveal.
  const rawEndCols: number[] = [];
  let advance = pad;
  for (const char of text) {
    advance += octx.measureText(char).width;
    rawEndCols.push(Math.round(advance / step));
  }

  const raw: boolean[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c += 1) {
      const sx = Math.min(width - 1, Math.floor((c + 0.5) * step));
      const sy = Math.min(height - 1, Math.floor((r + 0.5) * step));
      row.push(data[(sy * width + sx) * 4 + 3] > 90);
    }
    raw.push(row);
  }

  // Trim empty rows/cols so the label centers cleanly.
  let top = 0;
  let bottom = raw.length - 1;
  let left = 0;
  let right = cols - 1;
  const rowEmpty = (r: number) => raw[r].every((on) => !on);
  const colEmpty = (c: number) => raw.every((row) => !row[c]);
  while (top < bottom && rowEmpty(top)) top += 1;
  while (bottom > top && rowEmpty(bottom)) bottom -= 1;
  while (left < right && colEmpty(left)) left += 1;
  while (right > left && colEmpty(right)) right -= 1;

  const cells = raw
    .slice(top, bottom + 1)
    .map((row) => row.slice(left, right + 1));

  const trimmedCols = cells[0]?.length ?? 0;
  const charEndCols = rawEndCols.map((end) =>
    Math.max(0, Math.min(trimmedCols, end - left)),
  );

  return { cells, rows: cells.length, cols: trimmedCols, charEndCols };
}

export function LoadingScreen() {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dismiss lifecycle: wait for a minimum beat plus the window load event,
  // capped so a slow page never traps the visitor behind the overlay.
  useEffect(() => {
    if (!mounted) return;
    let leaveTimer = 0;
    let removeTimer = 0;

    const startLeaving = () => {
      setLeaving(true);
      removeTimer = window.setTimeout(() => setMounted(false), FADE_MS);
    };

    const loadedAt = performance.now();
    const scheduleLeave = () => {
      const elapsed = performance.now() - loadedAt;
      const wait = Math.max(0, MIN_DURATION - elapsed);
      leaveTimer = window.setTimeout(startLeaving, wait);
    };

    const capTimer = window.setTimeout(startLeaving, MAX_DURATION);

    if (document.readyState === "complete") {
      scheduleLeave();
    } else {
      window.addEventListener("load", scheduleLeave, { once: true });
    }

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
      window.clearTimeout(capTimer);
      window.removeEventListener("load", scheduleLeave);
    };
  }, [mounted]);

  // Lock body scroll while the overlay is up.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let frame = 0;
    let bgCanvas: HTMLCanvasElement | null = null;
    let grid: Grid | null = null;
    let layout = { cell: 12, originX: 0, originY: 0 };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let animStart = 0;

    const draw = (timestamp: number) => {
      if (!grid || !bgCanvas) return;
      if (!animStart) animStart = timestamp;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bgCanvas, 0, 0);

      const { cell } = layout;
      const inner = cell * 0.82;
      const inset = (cell - inner) / 2;
      const t = timestamp * 0.001;
      const [r, g, b] = ORANGE;

      // Typewriter reveal: one character every CHAR_MS, then hold.
      const charCount = grid.charEndCols.length;
      const elapsed = timestamp - animStart;
      const revealed = reducedMotion
        ? charCount
        : Math.min(charCount, Math.floor(elapsed / CHAR_MS));
      const typing = revealed < charCount;
      const revealCol = revealed > 0 ? grid.charEndCols[revealed - 1] : 0;

      // Bright text cells (only the columns written so far) with a soft flicker.
      ctx.save();
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.shadowBlur = reducedMotion ? cell * 0.5 : cell * 0.95;
      for (let row = 0; row < grid.rows; row += 1) {
        for (let col = 0; col < grid.cols; col += 1) {
          if (!grid.cells[row][col]) continue;
          if (col >= revealCol) continue;
          const flicker = reducedMotion
            ? 1
            : 0.82 + 0.18 * Math.sin(t * 6 + row * 0.9 + col * 0.6);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, flicker)})`;
          ctx.fillRect(
            layout.originX + col * cell + inset,
            layout.originY + row * cell + inset,
            inner,
            inner,
          );
        }
      }

      // Cursor block: rides the write head while typing, then blinks at the end.
      const solidWhileTyping = typing;
      const blink = solidWhileTyping || Math.floor(t / 0.53) % 2 === 0;
      if (blink) {
        const cursorCol = typing ? revealCol : grid.cols + 1;
        const cursorPx = layout.originX + cursorCol * cell;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
        const side = grid.rows * cell;
        ctx.fillRect(
          cursorPx + inset,
          layout.originY + inset,
          side - inset * 2,
          side - inset * 2,
        );
      }
      ctx.restore();
    };

    const buildBackground = (dpr: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const bg = document.createElement("canvas");
      bg.width = w;
      bg.height = h;
      const bctx = bg.getContext("2d");
      if (!bctx || !grid) return;

      bctx.fillStyle = "#090909";
      bctx.fillRect(0, 0, w, h);

      // Faint radial bloom behind the label.
      const cx = layout.originX + (grid.cols * layout.cell) / 2;
      const cy = layout.originY + (grid.rows * layout.cell) / 2;
      const bloom = bctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        Math.max(w, h) * 0.5,
      );
      const [r, g, b] = ORANGE;
      bloom.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.1)`);
      bloom.addColorStop(1, "rgba(255, 77, 0, 0)");
      bctx.fillStyle = bloom;
      bctx.fillRect(0, 0, w, h);

      // Dim LED grid tiled to the label pitch so the panel is always visible.
      const cell = layout.cell;
      const inner = cell * 0.82;
      const inset = (cell - inner) / 2;
      const startX = layout.originX % cell;
      const startY = layout.originY % cell;
      bctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
      for (let y = startY - cell; y < h; y += cell) {
        for (let x = startX - cell; x < w; x += cell) {
          bctx.fillRect(x + inset, y + inset, inner, inner);
        }
      }

      // Subtle scanlines for CRT texture.
      bctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      for (let y = 0; y < h; y += Math.max(2, Math.floor(3 * dpr))) {
        bctx.fillRect(0, y, w, 1);
      }

      bgCanvas = bg;
    };

    const relayout = () => {
      if (!grid || grid.cols === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);

      const cursorGap = 1;
      const cursorCells = grid.rows;
      const totalCols = grid.cols + cursorGap + cursorCells;
      const maxCellW = (vw * dpr * 0.34) / totalCols;
      const maxCellH = (vh * dpr * 0.18) / grid.rows;
      const cell = Math.max(3, Math.min(maxCellW, maxCellH, 9 * dpr));

      const blockW = totalCols * cell;
      const blockH = grid.rows * cell;
      const originX = (canvas.width - blockW) / 2;
      const originY = (canvas.height - blockH) / 2;

      layout = { cell, originX, originY };
      buildBackground(dpr);
    };

    const tick = (timestamp: number) => {
      draw(timestamp);
      if (!reducedMotion) frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      window.cancelAnimationFrame(frame);
      if (reducedMotion) {
        draw(performance.now());
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      relayout();
      start();
    };

    const handleMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      start();
    };

    const init = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // Fall through with whatever font is available.
      }
      if (disposed) return;
      const fontFamily =
        getComputedStyle(document.body)
          .getPropertyValue("--font-geist-pixel")
          .trim() || "monospace";
      grid = buildGrid(LABEL, fontFamily, 9);
      relayout();
      start();
    };

    void init();
    window.addEventListener("resize", handleResize);
    motionQuery.addEventListener("change", handleMotion);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", handleMotion);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <output
      className={`loading-screen${leaving ? " loading-screen--leaving" : ""}`}
      aria-live="polite"
    >
      <canvas ref={canvasRef} className="loading-screen__canvas" aria-hidden />
      <span className="sr-only">Loading The Realtime Hackathon</span>
    </output>
  );
}
