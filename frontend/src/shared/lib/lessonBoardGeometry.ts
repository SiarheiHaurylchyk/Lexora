import type { LessonStroke } from './lessonBoardModel';

function distPointSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const sign = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function ellipseMetric(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  px: number,
  py: number,
): number {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  if (rx < 1e-6 || ry < 1e-6) return Infinity;
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  return Math.sqrt(nx * nx + ny * ny);
}

function pointInDiamond(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bot = Math.max(y0, y1);
  const mx = (left + right) / 2;
  const my = (top + bot) / 2;
  return (
    pointInTriangle(px, py, mx, top, right, my, mx, bot) ||
    pointInTriangle(px, py, mx, top, left, my, mx, bot)
  );
}

/** ctx должен быть в мировых координатах (translate + scale как при отрисовке доски) */
function textBox(
  st: LessonStroke,
  ctx: CanvasRenderingContext2D,
): { l: number; t: number; r: number; b: number } | null {
  const txt = st.text?.trim();
  if (!txt || st.points.length < 2) return null;
  const fs = st.fontSize ?? 18;
  ctx.save();
  ctx.setLineDash([]);
  ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
  const w = ctx.measureText(txt).width;
  ctx.restore();
  const h = fs * 1.35;
  const x = st.points[0];
  const y = st.points[1];
  return { l: x, t: y, r: x + w, b: y + h };
}

/** Ось-aligned bounds с небольшим полем — для рамки выделения */
export function getStrokeBounds(
  st: LessonStroke,
  ctx: CanvasRenderingContext2D,
): { l: number; t: number; r: number; b: number } | null {
  const p = st.points;
  if (p.length < 2) return null;
  const pad = Math.max(st.width || 2, 4) + 4;

  if (st.tool === 'text') {
    const b = textBox(st, ctx);
    if (!b) return null;
    return { l: b.l - 4, t: b.t - 4, r: b.r + 4, b: b.b + 4 };
  }

  if (st.tool === 'pen' || st.tool === 'eraser') {
    if (p.length < 4) return null;
    let l = p[0];
    let t = p[1];
    let r = p[0];
    let b = p[1];
    for (let i = 0; i < p.length; i += 2) {
      l = Math.min(l, p[i]);
      r = Math.max(r, p[i]);
      t = Math.min(t, p[i + 1]);
      b = Math.max(b, p[i + 1]);
    }
    return { l: l - pad, t: t - pad, r: r + pad, b: b + pad };
  }

  if (
    st.tool === 'line' ||
    st.tool === 'rect' ||
    st.tool === 'ellipse' ||
    st.tool === 'arrow' ||
    st.tool === 'diamond'
  ) {
    if (p.length < 4) return null;
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const l = Math.min(x0, x1) - pad;
    const t = Math.min(y0, y1) - pad;
    const r = Math.max(x0, x1) + pad;
    const b = Math.max(y0, y1) + pad;
    return { l, t, r, b };
  }

  return null;
}

export function hitTestStroke(
  st: LessonStroke,
  wx: number,
  wy: number,
  viewScale: number,
  ctx: CanvasRenderingContext2D,
): boolean {
  const tol = Math.max(10 / viewScale, 5);
  const p = st.points;

  if (st.tool === 'text') {
    const b = textBox(st, ctx);
    if (!b) return false;
    return (
      wx >= b.l - tol && wx <= b.r + tol && wy >= b.t - tol && wy <= b.b + tol
    );
  }

  if (st.tool === 'pen' || st.tool === 'eraser') {
    if (p.length < 4) return false;
    const half =
      (st.tool === 'eraser' ? Math.max(st.width * 2.2, 10) : st.width) / 2 +
      tol;
    for (let i = 0; i < p.length - 2; i += 2) {
      if (distPointSegment(wx, wy, p[i], p[i + 1], p[i + 2], p[i + 3]) <= half)
        return true;
    }
    return false;
  }

  if (st.tool === 'line') {
    if (p.length < 4) return false;
    const half = st.width / 2 + tol;
    return distPointSegment(wx, wy, p[0], p[1], p[2], p[3]) <= half;
  }

  if (st.tool === 'arrow') {
    if (p.length < 4) return false;
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const baseW = st.width;
    const head = Math.min(Math.max(baseW * 2.8, 14 / viewScale), dist * 0.38);
    const ux = (x1 - x0) / Math.max(dist, 1e-6);
    const uy = (y1 - y0) / Math.max(dist, 1e-6);
    const sx = x1 - ux * head;
    const sy = y1 - uy * head;
    const half = baseW / 2 + tol;
    if (distPointSegment(wx, wy, x0, y0, sx, sy) <= half) return true;
    const px = -uy;
    const py = ux;
    const spread = head * 0.52;
    const bx = x1 - ux * head;
    const by = y1 - uy * head;
    return pointInTriangle(
      wx,
      wy,
      x1,
      y1,
      bx + px * spread,
      by + py * spread,
      bx - px * spread,
      by - py * spread,
    );
  }

  if (st.tool === 'rect') {
    if (p.length < 4) return false;
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const l = Math.min(x0, x1);
    const t = Math.min(y0, y1);
    const r = Math.max(x0, x1);
    const b = Math.max(y0, y1);
    const hasFill = !!(st.fillColor && st.fillColor.length > 0);
    const half = st.width / 2 + tol;
    if (hasFill && wx >= l && wx <= r && wy >= t && wy <= b) return true;
    const dTop = distPointSegment(wx, wy, l, t, r, t);
    const dBot = distPointSegment(wx, wy, l, b, r, b);
    const dL = distPointSegment(wx, wy, l, t, l, b);
    const dR = distPointSegment(wx, wy, r, t, r, b);
    return Math.min(dTop, dBot, dL, dR) <= half;
  }

  if (st.tool === 'ellipse') {
    if (p.length < 4) return false;
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const hasFill = !!(st.fillColor && st.fillColor.length > 0);
    const m = ellipseMetric(x0, y0, x1, y1, wx, wy);
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    const edgeTol = (st.width / 2 + tol) / Math.max(Math.min(rx, ry), 1e-6);
    if (hasFill && m <= 1) return true;
    return Math.abs(m - 1) <= edgeTol;
  }

  if (st.tool === 'diamond') {
    if (p.length < 4) return false;
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const hasFill = !!(st.fillColor && st.fillColor.length > 0);
    if (hasFill && pointInDiamond(wx, wy, x0, y0, x1, y1)) return true;
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bot = Math.max(y0, y1);
    const mx = (left + right) / 2;
    const my = (top + bot) / 2;
    const half = st.width / 2 + tol;
    if (distPointSegment(wx, wy, mx, top, right, my) <= half) return true;
    if (distPointSegment(wx, wy, right, my, mx, bot) <= half) return true;
    if (distPointSegment(wx, wy, mx, bot, left, my) <= half) return true;
    if (distPointSegment(wx, wy, left, my, mx, top) <= half) return true;
    return false;
  }

  return false;
}

/** Сверху вниз по z-order: последний в массиве — «выше» */
export function pickStrokeAt(
  strokes: LessonStroke[],
  wx: number,
  wy: number,
  viewScale: number,
  ctx: CanvasRenderingContext2D,
): LessonStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const st = strokes[i];
    if (hitTestStroke(st, wx, wy, viewScale, ctx)) return st;
  }
  return null;
}
