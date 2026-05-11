/**
 * Lexora «Урок на доске» — модель данных и формат синхронизации (проприетарная реализация).
 * Сервер ретранслирует JSON как есть; см. ClassroomWhiteboard WebSocket.
 */

export type LessonStrokeTool =
  | 'pen'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'diamond'
  | 'text';

export type LessonLineStyle = 'solid' | 'dashed' | 'dotted';

export interface LessonStroke {
  id: string;
  tool: LessonStrokeTool;
  color: string;
  width: number;
  /** pen/eraser: [x,y,...]; остальное: [x0,y0,x1,y1] в мировых координатах */
  points: number[];
  /** Обводка: пунктир и т.д. (ластик игнорирует) */
  lineStyle?: LessonLineStyle;
  /** Заливка замкнутых фигур (rect/ellipse/diamond); нет поля или пустая строка — без заливки */
  fillColor?: string;
  /** Непрозрачность обводки и заливки, 0–1 */
  opacity?: number;
  /** Скругление у rect */
  rounded?: boolean;
  /** Для tool === 'text': содержимое; points — [x,y] якорь (левый верх, baseline top) */
  text?: string;
  /** Размер шрифта в мировых пикселях (масштабируется с view) */
  fontSize?: number;
}

export interface LessonBoardView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface LessonBoardState {
  strokes: LessonStroke[];
  view: LessonBoardView;
}

export const DEFAULT_LESSON_BOARD_STATE: LessonBoardState = {
  strokes: [],
  view: { scale: 1, offsetX: 0, offsetY: 0 },
};

const TOOLS: LessonStrokeTool[] = [
  'pen',
  'eraser',
  'line',
  'rect',
  'ellipse',
  'arrow',
  'diamond',
  'text',
];

export function cloneLessonBoardState(s: LessonBoardState): LessonBoardState {
  return JSON.parse(JSON.stringify(s)) as LessonBoardState;
}

/** Wire envelope for WebSocket + optional localStorage full blob */
export function encodeLessonBoardWire(state: LessonBoardState): string {
  return JSON.stringify({ v: 2, lessonBoard: state });
}

function sanitizeStroke(raw: Record<string, unknown>): LessonStroke | null {
  if (
    !raw ||
    typeof raw.id !== 'string' ||
    typeof raw.tool !== 'string' ||
    !Array.isArray(raw.points)
  ) {
    return null;
  }
  const tool = raw.tool as LessonStrokeTool;
  if (!TOOLS.includes(tool)) return null;
  if (typeof raw.color !== 'string' || typeof raw.width !== 'number')
    return null;
  const points = raw.points.filter((n): n is number => typeof n === 'number');
  const st: LessonStroke = {
    id: raw.id,
    tool,
    color: raw.color,
    width: raw.width,
    points,
  };
  const ls = raw.lineStyle;
  if (ls === 'solid' || ls === 'dashed' || ls === 'dotted') {
    st.lineStyle = ls;
  }
  if (typeof raw.fillColor === 'string' && raw.fillColor.length > 0) {
    st.fillColor = raw.fillColor.slice(0, 32);
  }
  if (typeof raw.opacity === 'number' && Number.isFinite(raw.opacity)) {
    st.opacity = Math.min(1, Math.max(0.05, raw.opacity));
  }
  if (typeof raw.rounded === 'boolean') {
    st.rounded = raw.rounded;
  }
  if (tool === 'text') {
    if (typeof raw.text !== 'string' || points.length < 2) return null;
    const tx = raw.text.trim();
    if (tx.length === 0 || tx.length > 4000) return null;
    st.text = tx.slice(0, 4000);
    if (typeof raw.fontSize === 'number' && Number.isFinite(raw.fontSize)) {
      st.fontSize = Math.min(96, Math.max(10, raw.fontSize));
    }
  }
  return st;
}

export function decodeLessonBoardWire(raw: string): LessonBoardState | null {
  try {
    const o = JSON.parse(raw) as {
      v?: number;
      lessonBoard?: Record<string, unknown>;
    };
    if (
      !o ||
      (o.v !== 2 && o.v !== 3) ||
      !o.lessonBoard ||
      !Array.isArray(o.lessonBoard.strokes)
    ) {
      return null;
    }
    const vb = o.lessonBoard.view as LessonBoardView | undefined;
    const view: LessonBoardView =
      vb && typeof vb.scale === 'number'
        ? {
            scale: Math.min(8, Math.max(0.15, vb.scale)),
            offsetX: typeof vb.offsetX === 'number' ? vb.offsetX : 0,
            offsetY: typeof vb.offsetY === 'number' ? vb.offsetY : 0,
          }
        : { scale: 1, offsetX: 0, offsetY: 0 };
    const strokes: LessonStroke[] = [];
    for (const item of o.lessonBoard.strokes) {
      const st = sanitizeStroke(item as Record<string, unknown>);
      if (st) strokes.push(st);
    }
    return { strokes, view };
  } catch {
    return null;
  }
}

/** Load from localStorage: raw wire JSON or legacy bare object */
export function parseLessonBoardStored(raw: string): LessonBoardState | null {
  const fromWire = decodeLessonBoardWire(raw);
  if (fromWire) return fromWire;
  try {
    const o = JSON.parse(raw);
    if (o && Array.isArray(o.strokes)) {
      return decodeLessonBoardWire(JSON.stringify({ v: 2, lessonBoard: o }));
    }
  } catch {
    /* ignore */
  }
  return null;
}
