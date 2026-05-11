import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Grid3x3,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type,
  Undo2,
  XCircle,
} from 'lucide-react';

import { getStrokeBounds, pickStrokeAt } from '../lessonBoardGeometry';
import type {
  LessonBoardState,
  LessonBoardView,
  LessonLineStyle,
  LessonStroke,
  LessonStrokeTool,
} from '../lessonBoardModel';
import { cloneLessonBoardState } from '../lessonBoardModel';
import {
  getTightBounds,
  hitResizeHandle,
  type ResizeHandle,
  resizeHandleCenters,
  resizeStrokeFromHandle,
} from '../lessonBoardResize';

function withWorldCtx<T>(
  canvas: HTMLCanvasElement | null,
  view: LessonBoardView,
  fn: (ctx: CanvasRenderingContext2D) => T,
): T | null {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);
  try {
    return fn(ctx);
  } finally {
    ctx.restore();
  }
}

type Tool = LessonStrokeTool | 'pan' | 'select';

type TextEditState = {
  worldX: number;
  worldY: number;
  initial: string;
  editingId?: string;
};

const STROKE_COLORS = ['#f2f3f7', '#ff5c5c', '#5cff9d', '#6db3ff', '#ffd866'];
/** Полупрозрачные заливки + сплошные тёмные */
const FILL_COLORS = [
  '',
  '#3d445466',
  '#6db3ff44',
  '#ff5c5c44',
  '#5cff9d44',
  '#14161f',
];

const WIDTHS = [2, 5, 10];
const TEXT_SIZES = [16, 20, 24, 28];
/** Начать перенос только после сдвига курсора (чтобы работал двойной клик по тексту) */
const SELECT_DRAG_THRESHOLD_PX = 6;
const GRID_STEP = 28;
/** Тёмный холст в духе Excalidraw (canvas dark) */
const BOARD_BG = '#121212';

function newStrokeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function applyLineDash(
  ctx: CanvasRenderingContext2D,
  style: LessonLineStyle | undefined,
  viewScale: number,
) {
  const u = Math.max(3 / viewScale, 2);
  switch (style) {
    case 'dashed':
      ctx.setLineDash([u * 3.2, u * 2.2]);
      break;
    case 'dotted':
      ctx.setLineDash([u * 1.1, u * 2.4]);
      break;
    default:
      ctx.setLineDash([]);
  }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  headLenWorld: number,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const bx = x1 - ux * headLenWorld;
  const by = y1 - uy * headLenWorld;
  const spread = headLenWorld * 0.52;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx + px * spread, by + py * spread);
  ctx.lineTo(bx - px * spread, by - py * spread);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: LessonStroke,
  viewScale: number,
) {
  const p = stroke.points;
  const baseW =
    stroke.tool === 'eraser' ? Math.max(stroke.width * 2.2, 10) : stroke.width;

  if (stroke.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = baseW / viewScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.setLineDash([]);
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) {
      ctx.lineTo(p[i], p[i + 1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  const opacity = stroke.opacity ?? 1;
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = baseW / viewScale;
  ctx.lineCap = stroke.lineStyle === 'dotted' ? 'round' : 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  applyLineDash(ctx, stroke.lineStyle, viewScale);

  const fill =
    stroke.fillColor && stroke.fillColor.length > 0 ? stroke.fillColor : null;

  if (stroke.tool === 'pen') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) {
      ctx.lineTo(p[i], p[i + 1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'line') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[2], p[3]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'arrow') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const head = Math.min(Math.max(baseW * 2.8, 14 / viewScale), dist * 0.38);
    const ux = (x1 - x0) / Math.max(dist, 1e-6);
    const uy = (y1 - y0) / Math.max(dist, 1e-6);
    const sx = x1 - ux * head;
    const sy = y1 - uy * head;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    drawArrowHead(ctx, x0, y0, x1, y1, head);
    ctx.restore();
    return;
  }

  if (stroke.tool === 'rect') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const l = Math.min(x0, x1);
    const t = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    const rr = stroke.rounded
      ? Math.min(14 / viewScale, Math.min(w, h) * 0.12)
      : 0;
    ctx.beginPath();
    if (rr > 0 && typeof ctx.roundRect === 'function') {
      ctx.roundRect(l, t, w, h, rr);
    } else {
      ctx.rect(l, t, w, h);
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'ellipse') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'diamond') {
    if (p.length < 4) {
      ctx.restore();
      return;
    }
    const x0 = p[0];
    const y0 = p[1];
    const x1 = p[2];
    const y1 = p[3];
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bot = Math.max(y0, y1);
    const mx = (left + right) / 2;
    const my = (top + bot) / 2;
    ctx.beginPath();
    ctx.moveTo(mx, top);
    ctx.lineTo(right, my);
    ctx.lineTo(mx, bot);
    ctx.lineTo(left, my);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'text') {
    const txt = stroke.text?.trim();
    if (!txt || p.length < 2) {
      ctx.restore();
      return;
    }
    const fs = stroke.fontSize ?? 18;
    ctx.setLineDash([]);
    ctx.font = `${fs}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = stroke.color;
    ctx.fillText(txt, p[0], p[1]);
    ctx.restore();
    return;
  }

  ctx.restore();
}

function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  bounds: { l: number; t: number; r: number; b: number },
  viewScale: number,
) {
  ctx.save();
  ctx.setLineDash([8 / viewScale, 5 / viewScale]);
  ctx.strokeStyle = 'rgba(110, 179, 255, 0.95)';
  ctx.lineWidth = Math.max(1.2 / viewScale, 0.8);
  ctx.strokeRect(bounds.l, bounds.t, bounds.r - bounds.l, bounds.b - bounds.t);
  ctx.restore();
}

function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  bounds: { l: number; t: number; r: number; b: number },
  viewScale: number,
) {
  const half = Math.max(4 / viewScale, 2.5);
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f2f3f7';
  ctx.strokeStyle = 'rgba(110, 179, 255, 0.95)';
  ctx.lineWidth = Math.max(1 / viewScale, 0.6);
  for (const [, cx, cy] of resizeHandleCenters(bounds)) {
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
  }
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: LessonBoardState['view'],
  w: number,
  h: number,
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const z = view.scale;
  const ox = view.offsetX;
  const oy = view.offsetY;
  const worldLeft = -ox / z;
  const worldTop = -oy / z;
  const worldRight = (w - ox) / z;
  const worldBot = (h - oy) / z;
  const startX = Math.floor(worldLeft / GRID_STEP) * GRID_STEP;
  const startY = Math.floor(worldTop / GRID_STEP) * GRID_STEP;
  ctx.beginPath();
  for (let x = startX; x <= worldRight; x += GRID_STEP) {
    ctx.moveTo(x, worldTop);
    ctx.lineTo(x, worldBot);
  }
  for (let y = startY; y <= worldBot; y += GRID_STEP) {
    ctx.moveTo(worldLeft, y);
    ctx.lineTo(worldRight, y);
  }
  ctx.stroke();
  ctx.restore();
}

function bboxTools(t: LessonStrokeTool): boolean {
  return (
    t === 'line' ||
    t === 'rect' ||
    t === 'ellipse' ||
    t === 'arrow' ||
    t === 'diamond'
  );
}

export type LessonBoardProps = {
  className?: string;
  state: LessonBoardState;
  onChange: React.Dispatch<React.SetStateAction<LessonBoardState>>;
};

export function LessonBoard({ className, state, onChange }: LessonBoardProps) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<LessonBoardState[]>([]);
  const draftRef = useRef<LessonStroke | null>(null);
  const panRef = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const textEditRef = useRef<TextEditState | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  /** Ожидание перетаскивания после mousedown в режиме выделения */
  const selectPointerDownRef = useRef<{
    id: string;
    originPoints: number[];
    wx: number;
    wy: number;
    cx: number;
    cy: number;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    originPoints: number[];
    pointerStartWx: number;
    pointerStartWy: number;
  } | null>(null);
  /** Плавная отрисовка до прихода обновления из React */
  const dragVisualRef = useRef<{ id: string; points: number[] } | null>(null);
  const dragFlushRafRef = useRef<number | undefined>(undefined);
  const resizeRef = useRef<{
    id: string;
    handle: ResizeHandle;
    originStroke: LessonStroke;
    tight0: { l: number; t: number; r: number; b: number };
  } | null>(null);
  const resizeVisualRef = useRef<{ id: string; stroke: LessonStroke } | null>(
    null,
  );
  const resizeFlushRafRef = useRef<number | undefined>(undefined);
  /** Слой только для штрихов: ластик destination-out не трогает фон и сетку */
  const inkLayerRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(STROKE_COLORS[0]);
  const [fillColor, setFillColor] = useState<string>(FILL_COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [lineStyle, setLineStyle] = useState<LessonLineStyle>('solid');
  const [opacityPct, setOpacityPct] = useState(100);
  const [roundedRect, setRoundedRect] = useState(false);
  const [textFontSize, setTextFontSize] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingSelection, setDraggingSelection] = useState(false);
  const [resizingSelection, setResizingSelection] = useState(false);
  const [spacePanHeld, setSpacePanHeld] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [textEdit, setTextEdit] = useState<TextEditState | null>(null);

  // eslint-disable-next-line react-hooks/refs
  textEditRef.current = textEdit;
  // eslint-disable-next-line react-hooks/refs
  selectedIdRef.current = selectedId;

  const opacity = opacityPct / 100;

  const pushUndoSnapshot = useCallback((snapshot: LessonBoardState) => {
    undoStack.current.push(cloneLessonBoardState(snapshot));
    if (undoStack.current.length > 48) undoStack.current.shift();
  }, []);

  const cancelDragFlush = useCallback(() => {
    if (dragFlushRafRef.current != null) {
      cancelAnimationFrame(dragFlushRafRef.current);
      dragFlushRafRef.current = undefined;
    }
  }, []);

  const cancelResizeFlush = useCallback(() => {
    if (resizeFlushRafRef.current != null) {
      cancelAnimationFrame(resizeFlushRafRef.current);
      resizeFlushRafRef.current = undefined;
    }
  }, []);

  const clearSelectDragRefs = useCallback(() => {
    cancelDragFlush();
    cancelResizeFlush();
    selectPointerDownRef.current = null;
    dragRef.current = null;
    dragVisualRef.current = null;
    resizeRef.current = null;
    resizeVisualRef.current = null;
    setDraggingSelection(false);
    setResizingSelection(false);
  }, [cancelDragFlush, cancelResizeFlush]);

  const schedulePaint = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined;
      const canvas = canvasRef.current;
      const host = hostRef.current;
      if (!canvas || !host) return;
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (
        canvas.width !== Math.floor(w * dpr) ||
        canvas.height !== Math.floor(h * dpr)
      ) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BOARD_BG;
      ctx.fillRect(0, 0, w, h);

      const v = state.view;

      if (showGrid) {
        ctx.save();
        ctx.translate(v.offsetX, v.offsetY);
        ctx.scale(v.scale, v.scale);
        drawGrid(ctx, v, w, h);
        ctx.restore();
      }

      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      let inkEl = inkLayerRef.current;
      if (!inkEl) {
        inkEl = document.createElement('canvas');
        inkLayerRef.current = inkEl;
      }
      if (inkEl.width !== pw || inkEl.height !== ph) {
        inkEl.width = pw;
        inkEl.height = ph;
      }
      const inkCtx = inkEl.getContext('2d');
      if (!inkCtx) return;
      inkCtx.setTransform(1, 0, 0, 1, 0, 0);
      inkCtx.clearRect(0, 0, pw, ph);
      inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inkCtx.save();
      inkCtx.translate(v.offsetX, v.offsetY);
      inkCtx.scale(v.scale, v.scale);
      for (const st of state.strokes) {
        const rv = resizeVisualRef.current;
        const dv = dragVisualRef.current;
        let stDraw = st;
        if (rv?.id === st.id) stDraw = rv.stroke;
        else if (dv?.id === st.id) stDraw = { ...st, points: dv.points };
        drawStroke(inkCtx, stDraw, v.scale);
      }
      const d = draftRef.current;
      if (d) {
        drawStroke(inkCtx, d, v.scale);
      }
      inkCtx.restore();

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(inkEl, 0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.translate(v.offsetX, v.offsetY);
      ctx.scale(v.scale, v.scale);
      if (selectedId) {
        const sel = state.strokes.find((s) => s.id === selectedId);
        if (sel) {
          const rv = resizeVisualRef.current;
          const dv = dragVisualRef.current;
          let selDraw = sel;
          if (rv?.id === sel.id) selDraw = rv.stroke;
          else if (dv?.id === sel.id) selDraw = { ...sel, points: dv.points };
          const b = getStrokeBounds(selDraw, ctx);
          if (b) {
            drawSelectionRect(ctx, b, v.scale);
            drawResizeHandles(ctx, b, v.scale);
          }
        }
      }
      ctx.restore();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.strokes, state.view, selectedId, resizingSelection, showGrid]);

  useEffect(() => {
    schedulePaint();
  }, [schedulePaint, state]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.repeat) return;
      e.preventDefault();
      setSpacePanHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      setSpacePanHeld(false);
    };
    const onBlur = () => setSpacePanHeld(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (selectedId && !state.strokes.some((s) => s.id === selectedId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(null);
    }
  }, [state.strokes, selectedId]);

  useEffect(() => {
    if (!textEdit) return undefined;
    const id = window.requestAnimationFrame(() => {
      const el = textInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [textEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const sid = selectedIdRef.current;
      if (!sid) return;
      e.preventDefault();
      onChange((prev) => {
        pushUndoSnapshot(prev);
        return { ...prev, strokes: prev.strokes.filter((s) => s.id !== sid) };
      });
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange, pushUndoSnapshot]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const b = canvas.getBoundingClientRect();
      const cx = sx - b.left;
      const cy = sy - b.top;
      const v = state.view;
      return {
        x: (cx - v.offsetX) / v.scale,
        y: (cy - v.offsetY) / v.scale,
      };
    },
    [state.view],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const b = canvas.getBoundingClientRect();
      const mx = clientX - b.left;
      const my = clientY - b.top;
      onChange((prev) => {
        const v = prev.view;
        const wx = (mx - v.offsetX) / v.scale;
        const wy = (my - v.offsetY) / v.scale;
        const nextScale = Math.min(6, Math.max(0.2, v.scale * factor));
        return {
          ...prev,
          view: {
            scale: nextScale,
            offsetX: mx - wx * nextScale,
            offsetY: my - wy * nextScale,
          },
        };
      });
    },
    [onChange],
  );

  const pickAt = useCallback(
    (wx: number, wy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const v = state.view;
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(v.offsetX, v.offsetY);
      ctx.scale(v.scale, v.scale);
      const hit = pickStrokeAt(state.strokes, wx, wy, v.scale, ctx);
      ctx.restore();
      return hit;
    },
    [state.strokes, state.view],
  );

  const skipBlurCommitRef = useRef(false);

  const cancelTextInput = useCallback(() => {
    skipBlurCommitRef.current = true;
    textEditRef.current = null;
    setTextEdit(null);
  }, []);

  const commitTextInput = useCallback(
    (raw: string) => {
      const te = textEditRef.current;
      if (!te) return;
      textEditRef.current = null;
      const trimmed = raw.trim();
      if (te.editingId) {
        if (!trimmed) {
          onChange((prev) => {
            pushUndoSnapshot(prev);
            return {
              ...prev,
              strokes: prev.strokes.filter((s) => s.id !== te.editingId),
            };
          });
        } else {
          onChange((prev) => {
            pushUndoSnapshot(prev);
            return {
              ...prev,
              strokes: prev.strokes.map((s) =>
                s.id === te.editingId ? { ...s, text: trimmed } : s,
              ),
            };
          });
        }
      } else if (trimmed) {
        const stroke: LessonStroke = {
          id: newStrokeId(),
          tool: 'text',
          color,
          width: 0,
          points: [te.worldX, te.worldY],
          text: trimmed,
          fontSize: textFontSize,
          opacity,
        };
        onChange((prev) => {
          pushUndoSnapshot(prev);
          return { ...prev, strokes: [...prev.strokes, stroke] };
        });
      }
      setTextEdit(null);
    },
    [color, textFontSize, opacity, onChange, pushUndoSnapshot],
  );

  const deleteSelected = useCallback(() => {
    const sid = selectedIdRef.current;
    if (!sid) return;
    clearSelectDragRefs();
    onChange((prev) => {
      pushUndoSnapshot(prev);
      return { ...prev, strokes: prev.strokes.filter((s) => s.id !== sid) };
    });
    setSelectedId(null);
  }, [onChange, pushUndoSnapshot, clearSelectDragRefs]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => schedulePaint());
    ro.observe(el);
    return () => ro.disconnect();
  }, [schedulePaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomAt(e.clientX, e.clientY, factor);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const startDraft = (
    x: number,
    y: number,
    strokeTool: LessonStrokeTool,
  ): LessonStroke => {
    const common: LessonStroke = {
      id: newStrokeId(),
      tool: strokeTool,
      color,
      width,
      points: bboxTools(strokeTool) ? [x, y, x, y] : [x, y],
    };
    if (strokeTool === 'eraser') {
      return common;
    }
    common.lineStyle = lineStyle;
    common.opacity = opacity;
    if (strokeTool === 'rect' && roundedRect) {
      common.rounded = true;
    }
    const closedShape =
      strokeTool === 'rect' ||
      strokeTool === 'ellipse' ||
      strokeTool === 'diamond';
    if (closedShape && fillColor) {
      common.fillColor = fillColor;
    }
    return common;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (textEditRef.current) return;

    const panNow = tool === 'pan' || spacePanHeld;
    if (panNow) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      pushUndoSnapshot(state);
      panRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        ox: state.view.offsetX,
        oy: state.view.offsetY,
      };
      return;
    }

    if (tool === 'select') {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const hit = pickAt(x, y);

      if (e.detail === 2 && hit?.tool === 'text') {
        let onHandle = false;
        if (selectedId === hit.id && canvasRef.current) {
          const oh = withWorldCtx(canvasRef.current, state.view, (ctx) => {
            const sel = state.strokes.find((s) => s.id === selectedId);
            if (!sel) return false;
            const dv = dragVisualRef.current;
            const sd = dv?.id === sel.id ? { ...sel, points: dv.points } : sel;
            const b = getStrokeBounds(sd, ctx);
            if (!b) return false;
            return hitResizeHandle(x, y, b, state.view.scale) != null;
          });
          onHandle = !!oh;
        }
        if (!onHandle) {
          clearSelectDragRefs();
          setSelectedId(hit.id);
          setTextEdit({
            worldX: hit.points[0],
            worldY: hit.points[1],
            initial: hit.text ?? '',
            editingId: hit.id,
          });
          return;
        }
        return;
      }

      if (selectedId && canvasRef.current) {
        const selBase = state.strokes.find((s) => s.id === selectedId);
        if (selBase) {
          const handle = withWorldCtx(canvasRef.current, state.view, (ctx) => {
            const dv = dragVisualRef.current;
            const sd =
              dv?.id === selBase.id
                ? { ...selBase, points: dv.points }
                : selBase;
            const b = getStrokeBounds(sd, ctx);
            if (!b) return null;
            return hitResizeHandle(x, y, b, state.view.scale);
          });
          if (handle) {
            clearSelectDragRefs();
            const dv = dragVisualRef.current;
            const selDraw =
              dv?.id === selBase.id
                ? { ...selBase, points: dv.points }
                : selBase;
            const originStroke = JSON.parse(
              JSON.stringify(selDraw),
            ) as LessonStroke;
            const tight0 = withWorldCtx(canvasRef.current, state.view, (ctx) =>
              getTightBounds(selDraw, ctx),
            );
            if (tight0) {
              pushUndoSnapshot(state);
              resizeRef.current = {
                id: selBase.id,
                handle,
                originStroke,
                tight0,
              };
              setResizingSelection(true);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              return;
            }
          }
        }
      }

      if (!hit) {
        clearSelectDragRefs();
        setSelectedId(null);
        return;
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setSelectedId(hit.id);
      selectPointerDownRef.current = {
        id: hit.id,
        originPoints: [...hit.points],
        wx: x,
        wy: y,
        cx: e.clientX,
        cy: e.clientY,
      };
      return;
    }

    if (tool === 'text') {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setSelectedId(null);
      setTextEdit({ worldX: x, worldY: y, initial: '' });
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    if (tool === 'pen' || tool === 'eraser') {
      draftRef.current = startDraft(x, y, tool);
      schedulePaint();
      return;
    }
    if (bboxTools(tool)) {
      draftRef.current = startDraft(x, y, tool);
      schedulePaint();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panRef.current) {
      const pr = panRef.current;
      onChange((prev) => ({
        ...prev,
        view: {
          ...prev.view,
          offsetX: pr.ox + (e.clientX - pr.sx),
          offsetY: pr.oy + (e.clientY - pr.sy),
        },
      }));
      return;
    }

    if (resizeRef.current) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const r = resizeRef.current;
      const next = resizeStrokeFromHandle(
        r.originStroke,
        r.tight0,
        r.handle,
        x,
        y,
      );
      if (next) {
        resizeVisualRef.current = { id: r.id, stroke: next };
        schedulePaint();
        if (resizeFlushRafRef.current == null) {
          resizeFlushRafRef.current = requestAnimationFrame(() => {
            resizeFlushRafRef.current = undefined;
            const rv = resizeVisualRef.current;
            const rid = resizeRef.current?.id;
            if (rv && rid === rv.id) {
              onChange((prev) => ({
                ...prev,
                strokes: prev.strokes.map((s) =>
                  s.id === rv.id ? rv.stroke : s,
                ),
              }));
            }
          });
        }
      }
      return;
    }

    if (tool === 'select') {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const pending = selectPointerDownRef.current;
      if (pending && !dragRef.current) {
        const movedPx = Math.hypot(
          e.clientX - pending.cx,
          e.clientY - pending.cy,
        );
        if (movedPx >= SELECT_DRAG_THRESHOLD_PX) {
          pushUndoSnapshot(state);
          dragRef.current = {
            id: pending.id,
            originPoints: [...pending.originPoints],
            pointerStartWx: pending.wx,
            pointerStartWy: pending.wy,
          };
          selectPointerDownRef.current = null;
          setDraggingSelection(true);
        }
      }
      const dr = dragRef.current;
      if (dr) {
        const dx = x - dr.pointerStartWx;
        const dy = y - dr.pointerStartWy;
        const newPoints = dr.originPoints.map((v, i) =>
          i % 2 === 0 ? v + dx : v + dy,
        );
        dragVisualRef.current = { id: dr.id, points: newPoints };
        schedulePaint();
        if (dragFlushRafRef.current == null) {
          dragFlushRafRef.current = requestAnimationFrame(() => {
            dragFlushRafRef.current = undefined;
            const dv = dragVisualRef.current;
            const did = dragRef.current?.id;
            if (dv && did === dv.id) {
              onChange((prev) => ({
                ...prev,
                strokes: prev.strokes.map((s) =>
                  s.id === dv.id ? { ...s, points: dv.points } : s,
                ),
              }));
            }
          });
        }
      }
      return;
    }

    if (tool === 'text') return;
    const d = draftRef.current;
    if (!d) return;
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    if (d.tool === 'pen' || d.tool === 'eraser') {
      const pts = d.points;
      const lx = pts[pts.length - 2];
      const ly = pts[pts.length - 1];
      const dist = Math.hypot(x - lx, y - ly);
      if (dist < 1.2 / state.view.scale) return;
      d.points = [...pts, x, y];
      schedulePaint();
      return;
    }
    if (bboxTools(d.tool)) {
      d.points = [d.points[0], d.points[1], x, y];
      schedulePaint();
    }
  };

  const commitIfMeaningful = (d: LessonStroke) => {
    const minLen = 2 / state.view.scale;
    if (d.tool === 'pen' || d.tool === 'eraser') {
      return d.points.length >= 4;
    }
    const [x0, y0, x1, y1] = d.points;
    if (d.tool === 'line' || d.tool === 'arrow') {
      return Math.hypot(x1 - x0, y1 - y0) > minLen;
    }
    return Math.abs(x1 - x0) > minLen || Math.abs(y1 - y0) > minLen;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (panRef.current) {
      panRef.current = null;
      return;
    }

    selectPointerDownRef.current = null;

    if (resizeRef.current) {
      cancelResizeFlush();
      const rv = resizeVisualRef.current;
      const rr = resizeRef.current;
      if (rv && rr && rv.id === rr.id) {
        onChange((prev) => ({
          ...prev,
          strokes: prev.strokes.map((s) => (s.id === rv.id ? rv.stroke : s)),
        }));
      }
      resizeRef.current = null;
      resizeVisualRef.current = null;
      setResizingSelection(false);
      schedulePaint();
    }

    if (dragRef.current) {
      cancelDragFlush();
      const dv = dragVisualRef.current;
      const dr = dragRef.current;
      if (dr && dv && dv.id === dr.id) {
        onChange((prev) => ({
          ...prev,
          strokes: prev.strokes.map((s) =>
            s.id === dv.id ? { ...s, points: dv.points } : s,
          ),
        }));
      }
      dragRef.current = null;
      dragVisualRef.current = null;
      setDraggingSelection(false);
      schedulePaint();
    }

    const d = draftRef.current;
    draftRef.current = null;
    if (!d) return;
    if (commitIfMeaningful(d)) {
      onChange((prev) => {
        pushUndoSnapshot(prev);
        return { ...prev, strokes: [...prev.strokes, d] };
      });
    }
    schedulePaint();
  };

  const handleUndo = () => {
    clearSelectDragRefs();
    const prev = undoStack.current.pop();
    if (prev) {
      onChange(prev);
    }
  };

  const handleClear = () => {
    if (state.strokes.length === 0) return;
    clearSelectDragRefs();
    setSelectedId(null);
    onChange((prev) => {
      pushUndoSnapshot(prev);
      return { ...prev, strokes: [] };
    });
  };

  const setToolBtn = (next: Tool) => {
    setTool(next);
    draftRef.current = null;
    panRef.current = null;
    setTextEdit(null);
    clearSelectDragRefs();
    if (next !== 'select') setSelectedId(null);
    schedulePaint();
  };

  const toolBtn = (next: Tool, label: string, icon: React.ReactNode) => (
    <button
      key={next}
      type='button'
      className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text2)] hover:bg-white/10',
        tool === next && 'bg-white/15 text-[var(--accent)]',
      )}
      aria-label={label}
      aria-pressed={tool === next}
      onClick={() => setToolBtn(next)}
    >
      {icon}
    </button>
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-hidden',
        className,
      )}
    >
      <header
        className={
          'flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2'
        }
      >
        <div className={'min-w-0 flex-1'} aria-hidden />
        <div
          className={
            'flex max-w-[min(720px,100%)] flex-wrap items-center justify-center gap-1.5 rounded-[14px] border border-[var(--border)] bg-black/30 px-2.5 py-1.5'
          }
          role='toolbar'
          aria-label={t('classroom.lessonBoard.toolsAria')}
        >
          {toolBtn(
            'select',
            t('classroom.lessonBoard.select'),
            <MousePointer2 size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'pen',
            t('classroom.lessonBoard.pen'),
            <Pencil size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'text',
            t('classroom.lessonBoard.text'),
            <Type size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'eraser',
            t('classroom.lessonBoard.eraser'),
            <Eraser size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'line',
            t('classroom.lessonBoard.line'),
            <Minus size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'arrow',
            t('classroom.lessonBoard.arrow'),
            <ArrowRight size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'rect',
            t('classroom.lessonBoard.rect'),
            <Square size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'ellipse',
            t('classroom.lessonBoard.ellipse'),
            <Circle size={20} strokeWidth={2} />,
          )}
          {toolBtn(
            'diamond',
            t('classroom.lessonBoard.diamond'),
            <Diamond size={20} strokeWidth={2} />,
          )}
          <button
            type='button'
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text2)] hover:bg-white/10',
              tool === 'pan' && 'bg-white/15 text-[var(--accent)]',
              spacePanHeld && 'opacity-60',
            )}
            aria-label={t('classroom.lessonBoard.pan')}
            aria-pressed={tool === 'pan'}
            onClick={() => setToolBtn('pan')}
          >
            <Hand size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={'flex min-w-0 flex-1 justify-end gap-1.5'}>
          <button
            type='button'
            className={
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text2)] hover:bg-white/10'
            }
            aria-label={t('classroom.lessonBoard.deleteSelected')}
            disabled={!selectedId}
            onClick={deleteSelected}
          >
            <XCircle size={20} strokeWidth={2} />
          </button>
          <button
            type='button'
            className={
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text2)] hover:bg-white/10'
            }
            aria-label={t('classroom.lessonBoard.undo')}
            onClick={handleUndo}
          >
            <Undo2 size={20} strokeWidth={2} />
          </button>
          <button
            type='button'
            className={
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[var(--text2)] hover:bg-white/10'
            }
            aria-label={t('classroom.lessonBoard.clear')}
            onClick={handleClear}
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className={'flex min-h-0 min-w-0 flex-1'}>
        <aside
          className={
            'flex w-[200px] shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-3'
          }
          aria-label={t('classroom.lessonBoard.propertiesAria')}
        >
          <div className={'flex items-center gap-2'}>
            <button
              type='button'
              className={cn(
                'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/5 px-2 text-[13px] text-[var(--text3)]',
                showGrid && 'border-[var(--accent)]/55 text-[var(--accent)]',
              )}
              aria-pressed={showGrid}
              aria-label={t('classroom.lessonBoard.canvasGridAria')}
              onClick={() => setShowGrid((g) => !g)}
            >
              <Grid3x3 size={18} strokeWidth={2} className={''} aria-hidden />
              <span className={'text-[12px]'}>
                {t('classroom.lessonBoard.canvasGrid')}
              </span>
            </button>
          </div>

          <p
            className={
              'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
            }
          >
            {t('classroom.lessonBoard.stroke')}
          </p>
          <div
            className={'flex flex-wrap gap-2'}
            role='group'
            aria-label={t('classroom.lessonBoard.colors')}
          >
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                type='button'
                className={cn(
                  'h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0',
                  color === c &&
                    'border-[var(--accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]',
                )}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <p
            className={
              'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
            }
          >
            {t('classroom.lessonBoard.fill')}
          </p>
          <div
            className={'flex flex-wrap gap-2'}
            role='group'
            aria-label={t('classroom.lessonBoard.fill')}
          >
            {FILL_COLORS.map((c) => (
              <button
                key={c || 'none'}
                type='button'
                className={cn(
                  'h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0',
                  'h-6 w-6',
                  !c && 'bg-white/5',
                  fillColor === c &&
                    'border-[var(--accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]',
                )}
                style={c ? { background: c } : undefined}
                aria-label={c ? c : t('classroom.lessonBoard.fillNone')}
                onClick={() => setFillColor(c)}
              />
            ))}
          </div>

          <p
            className={
              'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
            }
          >
            {t('classroom.lessonBoard.width')}
          </p>
          <div
            className={'flex gap-2'}
            role='group'
            aria-label={t('classroom.lessonBoard.width')}
          >
            {WIDTHS.map((w) => (
              <button
                key={w}
                type='button'
                className={cn(
                  'flex h-[30px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-white/5 text-[11px] font-bold text-[var(--text3)]',
                  width === w && 'border-[var(--accent)] text-[var(--accent)]',
                )}
                onClick={() => setWidth(w)}
              >
                {w}
              </button>
            ))}
          </div>

          <p
            className={
              'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
            }
          >
            {t('classroom.lessonBoard.lineStyle')}
          </p>
          <div
            className={'flex gap-1.5'}
            role='group'
            aria-label={t('classroom.lessonBoard.lineStyle')}
          >
            {(
              [
                ['solid', t('classroom.lessonBoard.lineSolid')],
                ['dashed', t('classroom.lessonBoard.lineDashed')],
                ['dotted', t('classroom.lessonBoard.lineDotted')],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type='button'
                className={cn(
                  'flex h-[34px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-white/5 text-[var(--text2)]',
                  lineStyle === s && 'border-[var(--accent)]/55',
                )}
                aria-label={label}
                aria-pressed={lineStyle === s}
                onClick={() => setLineStyle(s)}
              >
                <span
                  className={'block h-0.5 w-5 bg-current'}
                  data-style={s}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          <div className={'flex items-center gap-2'}>
            <button
              type='button'
              className={cn(
                'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/5 px-2 text-[13px] text-[var(--text3)]',
                roundedRect && 'border-[var(--accent)]/55 text-[var(--accent)]',
              )}
              aria-pressed={roundedRect}
              disabled={tool !== 'rect'}
              onClick={() => setRoundedRect((v) => !v)}
            >
              <span
                className={'h-4 w-4 rounded-[2px] border border-current'}
                data-rounded={roundedRect}
                aria-hidden
              />
              <span className={'text-[12px]'}>
                {t('classroom.lessonBoard.roundedCorners')}
              </span>
            </button>
          </div>

          <label className={'flex flex-col gap-1'}>
            <span
              className={
                'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
              }
            >
              {t('classroom.lessonBoard.opacity')}
            </span>
            <input
              type='range'
              className={'w-full accent-[var(--accent)]'}
              min={10}
              max={100}
              step={5}
              value={opacityPct}
              onChange={(ev) => setOpacityPct(Number(ev.target.value))}
            />
            <span className={'text-[11px] text-[var(--text3)]'}>
              {opacityPct}%
            </span>
          </label>

          {tool === 'text' && (
            <>
              <p
                className={
                  'm-0 text-[10px] font-bold tracking-[0.06em] text-[var(--text3)] uppercase'
                }
              >
                {t('classroom.lessonBoard.textSize')}
              </p>
              <div
                className={'flex gap-2'}
                role='group'
                aria-label={t('classroom.lessonBoard.textSize')}
              >
                {TEXT_SIZES.map((fs) => (
                  <button
                    key={fs}
                    type='button'
                    className={cn(
                      'flex h-[30px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-white/5 text-[11px] font-bold text-[var(--text3)]',
                      textFontSize === fs &&
                        'border-[var(--accent)] text-[var(--accent)]',
                    )}
                    onClick={() => setTextFontSize(fs)}
                  >
                    {fs}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <div ref={hostRef} className={'relative flex-1 overflow-hidden'}>
          <canvas
            ref={canvasRef}
            className={cn(
              'absolute inset-0 touch-none',
              (tool === 'pan' || spacePanHeld) &&
                'cursor-grab active:cursor-grabbing',
              tool === 'text' && 'cursor-text',
              tool === 'select' && 'cursor-default',
              (draggingSelection || resizingSelection) && 'cursor-move',
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {textEdit && (
            <input
              ref={textInputRef}
              key={textEdit.editingId ?? 'new'}
              className={
                'absolute z-10 min-w-[80px] border-none bg-transparent text-[var(--text)] outline-1 outline-white/40 outline-dashed'
              }
              style={{
                left: textEdit.worldX * state.view.scale + state.view.offsetX,
                top: textEdit.worldY * state.view.scale + state.view.offsetY,
              }}
              defaultValue={textEdit.initial}
              aria-label={t('classroom.lessonBoard.textPlaceholder')}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault();
                  skipBlurCommitRef.current = true;
                  commitTextInput(ev.currentTarget.value);
                }
                if (ev.key === 'Escape') {
                  ev.preventDefault();
                  cancelTextInput();
                }
              }}
              onBlur={(ev) => {
                if (skipBlurCommitRef.current) {
                  skipBlurCommitRef.current = false;
                  return;
                }
                commitTextInput(ev.currentTarget.value);
              }}
            />
          )}
          <div
            className={
              'pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg bg-black/40 px-3 py-1 text-[11px] text-white/50'
            }
          >
            {t('classroom.lessonBoard.canvasHint')}
          </div>
        </div>
      </div>
    </div>
  );
}
