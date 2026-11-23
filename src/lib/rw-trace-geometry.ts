import { RW_HERSHEY_GLYPHS } from "@/lib/rw-hershey-glyphs";

export type RwTracePoint = { x: number; y: number };
export type RwTraceStroke = RwTracePoint[];

/** All glyph coordinates and pointer coordinates share this SVG view box. */
export const RW_TRACE_VIEW_BOX = { x: -4, y: -6, width: 32, height: 38 } as const;

export const RW_TRACE_THRESHOLDS = {
  precision: 72,
  coverage: 58,
  strokeCoverage: 35,
  tolerance: 2.6,
  coverageTolerance: 2.9,
} as const;

export type RwTraceEvaluation = {
  valid: boolean;
  incomplete: boolean;
  outOfBounds: boolean;
  precision: number;
  coverage: number;
  strokeCoverage: number;
  score: number;
};

const aliases: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
};

export function rwTraceGlyphPath(character: string): string {
  const normalized = aliases[character] ?? character;
  return RW_HERSHEY_GLYPHS[normalized] ?? "";
}

/** Hershey paths contain only M and L commands, with implicit subsequent lines. */
export function parseRwGlyph(path: string): RwTraceStroke[] {
  const tokens = path.match(/[ML]|-?\d+(?:\.\d+)?/g) ?? [];
  const strokes: RwTraceStroke[] = [];
  let command = "";
  let values: number[] = [];
  let current: RwTraceStroke = [];
  const flushPair = () => {
    if (values.length < 2) return;
    const point = { x: values[0] ?? 0, y: values[1] ?? 0 };
    values = values.slice(2);
    if (command === "M" && current.length === 0) {
      current = [point];
      strokes.push(current);
      command = "L";
    } else {
      current.push(point);
    }
  };
  for (const token of tokens) {
    if (token === "M" || token === "L") {
      command = token;
      if (token === "M") current = [];
      continue;
    }
    values.push(Number(token));
    if (values.length === 2) flushPair();
  }
  return strokes.filter((stroke) => stroke.length > 0);
}

function distance(a: RwTracePoint, b: RwTracePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function resampleRwTrace(points: RwTracePoint[], step = 0.3): RwTracePoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]!];
  const output: RwTracePoint[] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const length = distance(from, to);
    const divisions = Math.max(1, Math.ceil(length / step));
    for (let part = 1; part <= divisions; part += 1) {
      const ratio = part / divisions;
      output.push({ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio });
    }
  }
  return output;
}

function nearestDistance(point: RwTracePoint, candidates: RwTracePoint[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) best = Math.min(best, distance(point, candidate));
  return best;
}

function percent(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

export function rwTraceAttemptScore(input: {
  precision: number;
  coverage: number;
  strokeCoverage: number;
  previousAttempts?: number;
}) {
  const penalty = Math.min(20, Math.max(0, input.previousAttempts ?? 0) * 2);
  return Math.round(Math.max(0, Math.min(100,
    input.precision * 0.45 + input.coverage * 0.45 + input.strokeCoverage * 0.1 - penalty,
  )));
}

/** Deterministic geometric matching, with no AI, network request or paid service. */
export function evaluateRwTrace(
  character: string,
  userStrokes: RwTraceStroke[],
  outOfBounds = false,
  previousAttempts = 0,
): RwTraceEvaluation {
  const modelStrokes = parseRwGlyph(rwTraceGlyphPath(character)).map((stroke) => resampleRwTrace(stroke));
  const model = modelStrokes.flat();
  const user = userStrokes.flatMap((stroke) => resampleRwTrace(stroke));
  if (!model.length || !user.length || outOfBounds) {
    return { valid: false, incomplete: false, outOfBounds, precision: 0, coverage: 0, strokeCoverage: 0, score: 0 };
  }
  const precise = user.filter((point) => nearestDistance(point, model) <= RW_TRACE_THRESHOLDS.tolerance).length;
  const covered = model.filter((point) => nearestDistance(point, user) <= RW_TRACE_THRESHOLDS.coverageTolerance).length;
  const perStroke = modelStrokes.map((stroke) =>
    stroke.filter((point) => nearestDistance(point, user) <= RW_TRACE_THRESHOLDS.coverageTolerance).length / Math.max(1, stroke.length),
  );
  const precision = percent(precise / user.length);
  const coverage = percent(covered / model.length);
  const strokeCoverage = percent(Math.min(...perStroke));
  const valid = user.length > 1 &&
    precision >= RW_TRACE_THRESHOLDS.precision &&
    coverage >= RW_TRACE_THRESHOLDS.coverage &&
    strokeCoverage >= RW_TRACE_THRESHOLDS.strokeCoverage;
  return {
    valid,
    incomplete: !valid && precision >= 65 && (coverage < RW_TRACE_THRESHOLDS.coverage || strokeCoverage < RW_TRACE_THRESHOLDS.strokeCoverage),
    outOfBounds,
    precision,
    coverage,
    strokeCoverage,
    score: rwTraceAttemptScore({ precision, coverage, strokeCoverage, previousAttempts }),
  };
}

/** Spaces never require drawing. Every other supported character is mandatory. */
export function nextRwTraceCharacterIndex(sentence: string, fromIndex: number) {
  let index = Math.max(0, fromIndex);
  while (index < sentence.length && /\s/.test(sentence[index] ?? "")) index += 1;
  return index;
}

export function countRwTraceCharacters(sentence: string) {
  return Array.from(sentence).filter((character) => !/\s/.test(character) && rwTraceGlyphPath(character)).length;
}

export function rwTracePointToStored(point: RwTracePoint) {
  return {
    x: Math.round(((point.x - RW_TRACE_VIEW_BOX.x) / RW_TRACE_VIEW_BOX.width) * 1000) / 1000,
    y: Math.round(((point.y - RW_TRACE_VIEW_BOX.y) / RW_TRACE_VIEW_BOX.height) * 1000) / 1000,
  };
}

export function rwTracePointFromStored(point: RwTracePoint): RwTracePoint {
  return {
    x: RW_TRACE_VIEW_BOX.x + point.x * RW_TRACE_VIEW_BOX.width,
    y: RW_TRACE_VIEW_BOX.y + point.y * RW_TRACE_VIEW_BOX.height,
  };
}

export function rwTraceFinalScore(scores: number[]) {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, score) => sum + Math.max(0, Math.min(100, score)), 0) / scores.length);
}
