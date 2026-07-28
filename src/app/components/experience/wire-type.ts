/**
 * Letterforms as line segments, so type can be part of the wire world rather
 * than something drawn on top of it.
 *
 * Everything in this world is made of white hairlines; a title made of anything
 * else would be the one object that disobeys that rule. So glyphs come from a
 * 5x7 pixel matrix and are traced as *outlines*: a cell contributes an edge only
 * where its neighbour is empty. That collapses a block of lit pixels into the
 * silhouette of the letter instead of a swarm of little squares, which matters
 * because those squares would blow the density budget the floor grid works so
 * hard to hold.
 *
 * Output is in glyph space — x to the right from 0, y UP from 0, one unit per
 * pixel cell. The caller scales it and decides which world plane it lands on.
 */

/** Rows top→bottom, 5 bits each, bit 4 = leftmost column. */
const GLYPHS: Record<string, readonly number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1f],
  J: [0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0e],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** Blank columns between glyphs, in cells. */
const TRACKING = 1;
/** Width of a space, in cells. */
const SPACE_W = 3;

/** A segment in glyph space: [x0, y0, x1, y1]. */
export type Segment = readonly [number, number, number, number];

export type TextOutline = {
  segments: Segment[];
  /** Total advance width in cells. */
  width: number;
  /** Cap height in cells. */
  height: number;
};

function lit(rows: readonly number[], col: number, row: number): boolean {
  if (col < 0 || col >= GLYPH_W || row < 0 || row >= GLYPH_H) return false;
  return (rows[row] & (1 << (GLYPH_W - 1 - col))) !== 0;
}

/**
 * Trace one glyph's silhouette. Each lit cell contributes only the edges its
 * empty neighbours expose, so shared interior edges are never drawn — a solid
 * 5x7 block yields four segments, not 140.
 */
function glyphOutline(char: string, originX: number, out: Segment[]): void {
  const rows = GLYPHS[char];
  if (!rows) return;
  for (let row = 0; row < GLYPH_H; row += 1) {
    for (let col = 0; col < GLYPH_W; col += 1) {
      if (!lit(rows, col, row)) continue;
      // Cell spans [x, x+1] and, with y measured upward, [y, y+1].
      const x = originX + col;
      const y = GLYPH_H - 1 - row;
      if (!lit(rows, col, row - 1)) out.push([x, y + 1, x + 1, y + 1]); // top
      if (!lit(rows, col, row + 1)) out.push([x, y, x + 1, y]); // bottom
      if (!lit(rows, col - 1, row)) out.push([x, y, x, y + 1]); // left
      if (!lit(rows, col + 1, row)) out.push([x + 1, y, x + 1, y + 1]); // right
    }
  }
}

/** Lay out a string and return its outline in glyph space, x starting at 0. */
export function textOutline(text: string): TextOutline {
  const segments: Segment[] = [];
  let cursor = 0;
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i += 1) {
    const char = upper[i];
    if (char === " ") {
      cursor += SPACE_W + TRACKING;
      continue;
    }
    if (!GLYPHS[char]) continue;
    glyphOutline(char, cursor, segments);
    cursor += GLYPH_W + TRACKING;
  }
  return {
    segments,
    width: Math.max(0, cursor - TRACKING),
    height: GLYPH_H,
  };
}

/**
 * Lay out several lines, centred on x and stacked downward in y, and return the
 * outline of the block with its own origin at the centre-top.
 *
 * `leading` is measured in cells between baselines.
 */
export function textBlockOutline(
  lines: readonly string[],
  leading = GLYPH_H + 3,
): TextOutline {
  const laid = lines.map((line) => textOutline(line));
  const width = laid.reduce((max, l) => Math.max(max, l.width), 0);
  const segments: Segment[] = [];
  laid.forEach((line, i) => {
    const dx = (width - line.width) / 2;
    const dy = -i * leading;
    for (const [x0, y0, x1, y1] of line.segments) {
      segments.push([x0 + dx, y0 + dy, x1 + dx, y1 + dy]);
    }
  });
  const height = (lines.length - 1) * leading + GLYPH_H;
  // Recentre so (0, 0) is the block's centre.
  const cx = width / 2;
  const cy = GLYPH_H - height / 2;
  return {
    segments: segments.map(
      ([x0, y0, x1, y1]) =>
        [x0 - cx, y0 - cy, x1 - cx, y1 - cy] as const satisfies Segment,
    ),
    width,
    height,
  };
}
