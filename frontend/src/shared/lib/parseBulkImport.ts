/**
 * Парсер вставленных списков карточек.
 *
 * Поддерживает форматы экспорта Lexora, Quizlet, Anki, обычные CSV и
 * markdown-таблицы. На вход — «как есть» из буфера обмена, на выходе —
 * массив `{ term, definition, example? }` плюс счётчик строк, которые
 * не удалось распознать (для информационного toast).
 */

export interface ParsedBulkCard {
  term: string;
  definition: string;
  example?: string;
}

export interface ParseBulkImportResult {
  cards: ParsedBulkCard[];
  /** Сколько непустых строк не удалось распознать (заголовки, мусор). */
  skippedLines: number;
}

/** Шаблоны строк-«заголовков», которые надо игнорировать. */
const HEADER_PATTERNS = [
  /^(слово|слово\s*\/|word|term|front|definition|def|back|перевод|translation)\b/i,
  /^(прилагательн|существительн|глагол|фраз|nouns?|adjectives?|verbs?|phrases?)\b/i,
  /^(уровень|level)\b/i,
];

/** Убрать BOM (\uFEFF) — частый «невидимый» префикс UTF-8 файлов. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Привести строку к более «удобному» виду перед парсингом. */
function normalizeLine(raw: string): string {
  let line = stripBom(raw).trim();
  if (!line) return '';

  // Markdown-таблица: «| term | definition |» → «term\tdefinition»
  if (line.startsWith('|') && line.endsWith('|')) {
    line = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .join('\t');
  }

  // Нумерованный список: «1. term - def» или «1) term»
  line = line.replace(/^\d+[.)]\s+/, '');

  // Снять обёрточные кавычки
  if (
    (line.startsWith('"') && line.endsWith('"')) ||
    (line.startsWith("'") && line.endsWith("'"))
  ) {
    line = line.slice(1, -1).trim();
  }

  return line;
}

/** Стоит ли пропустить строку (пустая, разделитель таблицы, заголовок). */
function isSkippableLine(line: string): boolean {
  if (!line) return true;
  if (/^[-=|_\s]+$/.test(line)) return true;
  if (/^\|.+\|[\s|]*$/.test(line) && line.includes('---')) return true;
  return HEADER_PATTERNS.some((re) => re.test(line));
}

/** Собрать карточку из массива «ячеек» одной строки таблицы. */
function cardFromParts(parts: string[]): ParsedBulkCard | null {
  const cells = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  if (cells.length < 2) return null;
  const [term, definition, example] = cells;
  if (!term || !definition) return null;
  if (isSkippableLine(term) && cells.length === 2) return null;
  return { term, definition, example: example || undefined };
}

/** Разделить строку по первому вхождению `delimiter` и собрать карточку. */
function parseByDelimiter(
  line: string,
  delimiter: string,
): ParsedBulkCard | null {
  if (!line.includes(delimiter)) return null;
  const idx = line.indexOf(delimiter);
  const term = line.slice(0, idx).trim();
  const rest = line.slice(idx + delimiter.length).trim();
  if (!term || !rest) return null;
  if (delimiter === ';') {
    const semiParts = rest.split(';').map((p) => p.trim());
    return cardFromParts(
      [term, semiParts[0], semiParts[1] ?? ''].filter(Boolean),
    );
  }
  return cardFromParts([term, rest]);
}

/** Попытаться распарсить одну строку в карточку (или вернуть null). */
function parseLine(raw: string): ParsedBulkCard | null {
  const line = normalizeLine(raw);
  if (!line || isSkippableLine(line)) return null;

  // 1) TSV (Quizlet/Excel): высший приоритет
  if (line.includes('\t')) {
    const card = cardFromParts(line.split('\t'));
    if (card) return card;
  }

  // 2) Pipe-separated (некоторые экспорты)
  if (line.includes('|')) {
    const card = cardFromParts(line.split('|'));
    if (card) return card;
  }

  // 3) Lexora-стиль и Quizlet «между термином и переводом» = «term - def»
  const spacedDash = parseByDelimiter(line, ' - ');
  if (spacedDash) return spacedDash;

  // 4) Длинные тире с пробелами: «term – def» или «term — def»
  const enDash = line.match(/^(.+?)\s+[–—]\s+(.+)$/);
  if (enDash) {
    return cardFromParts([enDash[1], enDash[2]]);
  }

  // 5) Точка с запятой (Anki, европейский CSV)
  const semi = parseByDelimiter(line, ';');
  if (semi) return semi;

  // 6) Запятая — только если ровно одна, иначе риск порезать длинное определение
  const commaIdx = line.indexOf(',');
  if (commaIdx > 0 && !line.includes('\t') && !line.includes(';')) {
    const left = line.slice(0, commaIdx).trim();
    const right = line.slice(commaIdx + 1).trim();
    if (left.length >= 2 && right.length >= 2 && !left.includes(',')) {
      const card = cardFromParts([left, right]);
      if (card) return card;
    }
  }

  // 7) Двоеточие «term: definition» (URLы пропускаем)
  const colonMatch = line.match(/^([^:]+):\s+(.+)$/);
  if (colonMatch && !/^https?:\/\//i.test(colonMatch[1])) {
    return cardFromParts([colonMatch[1], colonMatch[2]]);
  }

  // 8) Последняя надежда — «word-definition» с тире без пробелов
  const tightDash = line.match(/^([^-]+)-\s*(.+)$/);
  if (tightDash && !line.includes(' - ')) {
    const term = tightDash[1].trim();
    const def = tightDash[2].trim();
    if (term.length >= 2 && def.length >= 2) {
      return cardFromParts([term, def]);
    }
  }

  return null;
}

/** Распарсить весь вставленный текст в список карточек. */
export function parseBulkImport(text: string): ParseBulkImportResult {
  const normalized = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const cards: ParsedBulkCard[] = [];
  let skippedLines = 0;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const card = parseLine(raw);
    if (card) cards.push(card);
    else skippedLines += 1;
  }

  return { cards, skippedLines };
}

/** Быстрая «оценка» количества карточек для лейбла кнопки «Импорт». */
export function countBulkImportPreview(text: string): number {
  return parseBulkImport(text).cards.length;
}
