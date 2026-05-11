import type { LessonStroke } from './lessonBoardModel';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const MIN_BOX = 4;
const MIN_TEXT_FS = 10;
/** Совпадает с санитайзером lessonBoardModel */
const MAX_TEXT_FS = 96;

/** Попадание в маркер на рамке выделения (те же координаты, что у отрисовки ручек) */
export function hitResizeHandle(
  wx: number,
  wy: number,
  b: { l: number; t: number; r: number; b: number },
  viewScale: number,
): ResizeHandle | null {
  const half = Math.max(5 / viewScale, 3);
  const inSq = (cx: number, cy: number) =>
    Math.abs(wx - cx) <= half && Math.abs(wy - cy) <= half;
  const mx = (b.l + b.r) / 2;
  const my = (b.t + b.b) / 2;
  const pts: [ResizeHandle, number, number][] = [
    ['nw', b.l, b.t],
    ['n', mx, b.t],
    ['ne', b.r, b.t],
    ['e', b.r, my],
    ['se', b.r, b.b],
    ['s', mx, b.b],
    ['sw', b.l, b.b],
    ['w', b.l, my],
  ];
  for (const [h, cx, cy] of pts) {
    if (inSq(cx, cy)) return h;
  }
  return null;
}

export function resizeHandleCenters(b: {
  l: number;
  t: number;
  r: number;
  b: number;
}): [ResizeHandle, number, number][] {
  const mx = (b.l + b.r) / 2;
  const my = (b.t + b.b) / 2;
  return [
    ['nw', b.l, b.t],
    ['n', mx, b.t],
    ['ne', b.r, b.t],
    ['e', b.r, my],
    ['se', b.r, b.b],
    ['s', mx, b.b],
    ['sw', b.l, b.b],
    ['w', b.l, my],
  ];
}

function mapLin(
  v: number,
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  if (Math.abs(a1 - a0) < 1e-9) return b0;
  return b0 + ((v - a0) * (b1 - b0)) / (a1 - a0);
}

function clampBox(
  L: number,
  T: number,
  R: number,
  B: number,
): { L: number; T: number; R: number; B: number } {
  let L2 = L;
  let T2 = T;
  let R2 = R;
  let B2 = B;
  if (R2 - L2 < MIN_BOX) {
    const c = (L2 + R2) / 2;
    L2 = c - MIN_BOX / 2;
    R2 = c + MIN_BOX / 2;
  }
  if (B2 - T2 < MIN_BOX) {
    const c = (T2 + B2) / 2;
    T2 = c - MIN_BOX / 2;
    B2 = c + MIN_BOX / 2;
  }
  return { L: L2, T: T2, R: R2, B: B2 };
}

/** Тight AABB содержимого (без поля выделения) — для преобразования при ресайзе */
export function getTightBounds(
  st: LessonStroke,
  ctx: CanvasRenderingContext2D,
): { l: number; t: number; r: number; b: number } | null {
  const p = st.points;
  if (st.tool === 'text') {
    const txt = st.text?.trim();
    if (!txt || p.length < 2) return null;
    const fs = st.fontSize ?? 18;
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
    const w = ctx.measureText(txt).width;
    ctx.restore();
    const h = fs * 1.35;
    return { l: p[0], t: p[1], r: p[0] + w, b: p[1] + h };
  }
  if ((st.tool === 'pen' || st.tool === 'eraser') && p.length >= 4) {
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
    return { l, t, r, b };
  }
  if (
    p.length >= 4 &&
    (st.tool === 'line' ||
      st.tool === 'rect' ||
      st.tool === 'ellipse' ||
      st.tool === 'arrow' ||
      st.tool === 'diamond')
  ) {
    return {
      l: Math.min(p[0], p[2]),
      r: Math.max(p[0], p[2]),
      t: Math.min(p[1], p[3]),
      b: Math.max(p[1], p[3]),
    };
  }
  return null;
}

function mapPenToBox(
  points: number[],
  oL: number,
  oT: number,
  oR: number,
  oB: number,
  nL: number,
  nT: number,
  nR: number,
  nB: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    out.push(
      mapLin(points[i], oL, oR, nL, nR),
      mapLin(points[i + 1], oT, oB, nT, nB),
    );
  }
  return out;
}

/**
 * Новое состояние штриха: указатель (wx,wy) задаёт новую грань/угол относительно tight-бокса на момент начала.
 */
export function resizeStrokeFromHandle(
  origin: LessonStroke,
  tight0: { l: number; t: number; r: number; b: number },
  handle: ResizeHandle,
  wx: number,
  wy: number,
): LessonStroke | null {
  const L0 = tight0.l;
  const T0 = tight0.t;
  const R0 = tight0.r;
  const B0 = tight0.b;
  let L = L0;
  let T = T0;
  let R = R0;
  let B = B0;

  switch (handle) {
    case 'nw':
      L = wx;
      T = wy;
      R = R0;
      B = B0;
      break;
    case 'n':
      T = wy;
      break;
    case 'ne':
      R = wx;
      T = wy;
      break;
    case 'e':
      R = wx;
      break;
    case 'se':
      R = wx;
      B = wy;
      break;
    case 's':
      B = wy;
      break;
    case 'sw':
      L = wx;
      B = wy;
      break;
    case 'w':
      L = wx;
      break;
    default:
      return null;
  }

  const box = clampBox(L, T, R, B);
  L = box.L;
  T = box.T;
  R = box.R;
  B = box.B;

  const w0 = Math.max(R0 - L0, 1e-6);
  const h0 = Math.max(B0 - T0, 1e-6);
  const w1 = R - L;
  const h1 = B - T;

  if (origin.tool === 'pen' || origin.tool === 'eraser') {
    const pts = mapPenToBox(origin.points, L0, T0, R0, B0, L, T, R, B);
    return { ...origin, points: pts };
  }

  if (
    origin.tool === 'line' ||
    origin.tool === 'rect' ||
    origin.tool === 'ellipse' ||
    origin.tool === 'arrow' ||
    origin.tool === 'diamond'
  ) {
    return { ...origin, points: [L, T, R, B] };
  }

  if (origin.tool === 'text') {
    const txt = origin.text?.trim();
    if (!txt || origin.points.length < 2) return null;
    const fs0 = origin.fontSize ?? 18;
    let s = 1;
    if (handle === 'e' || handle === 'w') {
      s = w1 / w0;
    } else if (handle === 'n' || handle === 's') {
      s = h1 / h0;
    } else {
      s = Math.min(w1 / w0, h1 / h0);
    }
    const newFs = Math.min(MAX_TEXT_FS, Math.max(MIN_TEXT_FS, fs0 * s));
    return {
      ...origin,
      points: [L, T],
      fontSize: newFs,
    };
  }

  return null;
}
