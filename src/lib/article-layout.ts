export type BlockKind = "heading" | "paragraph" | "list-item" | "list-continuation" | "quote" | "spacer";

export interface LineStyle {
  fontSize: number;
  weight: number;
  family: string;
  italic?: boolean;
}

export interface ArticleLine {
  kind: BlockKind | "separator";
  text: string;
  fontSize: number;
  weight: number;
  italic: boolean;
}

export interface PlacedLine extends ArticleLine {
  x: number;
  y: number;
  angleDeg: number;
  lineWidth?: number;
  _lineIndex: number;
}

export interface TrackShape {
  point(t: number): { x: number; y: number; angleDeg: number; lineWidth?: number };
  perimeter: number;
  lineWidth: number;
  outerWidth: number;
  outerHeight: number;
  outerBorderRadius: string;
  innerWidth: number;
  innerHeight: number;
  innerBorderRadius: string;
  outerGuidePath?(cx: number, cy: number): string;
  innerGuidePath?(cx: number, cy: number): string;
}

export interface StadiumShapeOptions {
  scale?: number;
  innerRatioX?: number;
  innerRatioY?: number;
  shapeX?: number;
  shapeY?: number;
  cornerRadius?: number;
}

export interface EllipseShapeOptions {
  scale?: number;
  innerRatioX?: number;
  innerRatioY?: number;
  shapeX?: number;
  shapeY?: number;
}

const BODY_STYLE: LineStyle = Object.freeze({
  fontSize: 9,
  weight: 400,
  family: "Georgia, serif",
});

const STYLE_BY_KIND: Record<string, LineStyle> = Object.freeze({
  heading: Object.freeze({ fontSize: 11, weight: 700, family: "Georgia, serif" }),
  paragraph: BODY_STYLE,
  "list-item": BODY_STYLE,
  "list-continuation": BODY_STYLE,
  quote: Object.freeze({ fontSize: 9, weight: 400, family: "Georgia, serif", italic: true }),
  spacer: BODY_STYLE,
});

const DISC_MARGIN = 4;
const INNER_RADIUS_RATIO = 0.44;

const HEADING_MARKER_RE = /^(#{1,6})\s+(.+)$/;
const LIST_MARKER_RE = /^[-*+]\s+(.+)$/;
const NUMBERED_MARKER_RE = /^\d+[.)]\s+(.+)$/;
const QUOTE_MARKER_RE = /^>\s?(.+)$/;
const THEMATIC_BREAK_RE = /^([-*_=])\1{2,}\s*$/;

interface Block {
  kind: BlockKind;
  text: string;
  level?: number;
}

export function parseArticle(source: string): Block[] {
  const normalized = source.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push({
      kind: "paragraph",
      text: normalizeInlineText(paragraph.join(" ")),
    });
    paragraph = [];
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      return;
    }

    const heading = line.match(HEADING_MARKER_RE);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        text: normalizeInlineText(heading[2]),
        level: Math.min(heading[1].length, 3),
      });
      return;
    }

    const listItem = line.match(LIST_MARKER_RE) || line.match(NUMBERED_MARKER_RE);
    if (listItem) {
      flushParagraph();
      blocks.push({
        kind: "list-item",
        text: normalizeInlineText(listItem[1]),
      });
      return;
    }

    const quote = line.match(QUOTE_MARKER_RE);
    if (quote) {
      flushParagraph();
      blocks.push({
        kind: "quote",
        text: normalizeInlineText(quote[1]),
      });
      return;
    }

    if (THEMATIC_BREAK_RE.test(line)) {
      flushParagraph();
      return;
    }

    const previousLine = index > 0 ? lines[index - 1].trim() : "";
    const nextLine = lines[index + 1]?.trim() ?? "";
    const looksLikeTitle =
      blocks.length === 0 &&
      paragraph.length === 0 &&
      index <= 1 &&
      line.length <= 90 &&
      !/[.!,:;]$/.test(line) &&
      nextLine.length > 0 &&
      previousLine.length === 0;

    if (looksLikeTitle) {
      blocks.push({
        kind: "heading",
        text: normalizeInlineText(line),
        level: 1,
      });
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();

  return blocks;
}

export interface ParsedArticleBlock {
  kind: BlockKind | "spacer";
  text: string;
  style: LineStyle;
}

/** Returns article blocks with prefixes/spacers applied, ready for per-slot wrapping. */
export function getArticleBlocks(source: string): ParsedArticleBlock[] {
  const blocks = parseArticle(source);
  const result: ParsedArticleBlock[] = [];

  blocks.forEach((block, index) => {
    if (index > 0 && shouldInsertSpacer(blocks[index - 1], block)) {
      result.push({ kind: "spacer", text: "", style: BODY_STYLE });
    }
    const prefix = block.kind === "list-item" ? "- " : block.kind === "quote" ? '"' : "";
    const suffix = block.kind === "quote" ? '"' : "";
    result.push({ kind: block.kind, text: `${prefix}${block.text}${suffix}`, style: getStyle(block.kind) });
  });

  return result;
}

export function buildArticleLines(
  source: string,
  options: { maxWidth: number; wrapText: (text: string, maxWidth: number, style: LineStyle) => string[] },
): ArticleLine[] {
  const maxWidth = options.maxWidth;
  const wrapText = options.wrapText;
  const blocks = parseArticle(source);
  const lines: ArticleLine[] = [];

  blocks.forEach((block, index) => {
    const previous = blocks[index - 1];

    if (index > 0 && shouldInsertSpacer(previous, block)) {
      lines.push(createSpacerLine());
    }

    const style = getStyle(block.kind);
    const prefix = block.kind === "list-item" ? "- " : block.kind === "quote" ? '"' : "";
    const suffix = block.kind === "quote" ? '"' : "";
    const wrapped = wrapText(`${prefix}${block.text}${suffix}`, maxWidth, style);

    wrapped.forEach((text, lineIndex) => {
      lines.push({
        kind: lineIndex > 0 && block.kind === "list-item" ? "list-continuation" : block.kind,
        text: lineIndex > 0 && block.kind === "list-item" ? `  ${text}` : text,
        fontSize: style.fontSize,
        weight: style.weight,
        italic: Boolean(style.italic),
      });
    });
  });

  return lines;
}

export function layoutCircleLines(lines: ArticleLine[], startAngle = -90): PlacedLine[] {
  if (lines.length === 0) {
    return [];
  }

  const angleStep = 360 / lines.length;

  return lines.map((line, index) => ({
    ...line,
    angleDeg: startAngle + index * angleStep,
    x: 0,
    y: 0,
    _lineIndex: index,
  }));
}

export function calculateDiscGeometry(viewportWidth: number, viewportHeight: number) {
  const outerRadius = Math.max(1, Math.floor(Math.min(viewportWidth, viewportHeight) / 2) - DISC_MARGIN);
  const innerRadius = Math.max(1, Math.round(outerRadius * INNER_RADIUS_RATIO));

  return {
    outerRadius,
    innerRadius,
    lineWidth: outerRadius - innerRadius,
  };
}

export function layoutShapeLines(
  lines: ArticleLine[],
  shape: TrackShape,
  startT = 0,
  minSpacing = 12,
  loop = false,
): (PlacedLine | null)[] {
  if (lines.length === 0) return [];

  const { perimeter } = shape;
  const step = minSpacing / perimeter;
  const numSlots = Math.ceil(1 / step) + 1;

  const beltPos = loop
    ? ((startT % 1) + 1) % 1 * lines.length
    : Math.max(0, Math.min(startT, 1)) * lines.length;
  const firstIdx = Math.floor(beltPos);
  const frac = beltPos - firstIdx;

  const result: (PlacedLine | null)[] = [];
  for (let i = 0; i < numSlots; i++) {
    const t = (i - frac) * step;
    const lineIndex = loop
      ? (firstIdx + i) % lines.length
      : firstIdx + i;
    if (t < 0 || t >= 1 || lineIndex < 0 || lineIndex >= lines.length) {
      result.push(null);
      continue;
    }
    const pt = shape.point(t);
    result.push({ ...lines[lineIndex], ...pt, _lineIndex: lineIndex });
  }
  return result;
}

// --- Superellipse helpers ---

function superellipseXY(a: number, b: number, n: number, theta: number) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return {
    x: a * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / n),
    y: b * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / n),
  };
}

function superellipseNormal(a: number, b: number, n: number, x: number, y: number) {
  const gx = (x < 0 ? -1 : 1) * Math.pow(Math.abs(x / a), n - 1) / a;
  const gy = (y < 0 ? -1 : 1) * Math.pow(Math.abs(y / b), n - 1) / b;
  const len = Math.sqrt(gx * gx + gy * gy) || 1;
  return { nx: gx / len, ny: gy / len };
}

// Distance along outward ray from inner superellipse point to outer superellipse boundary.
function superellipseRayDist(
  px: number, py: number, nx: number, ny: number,
  a: number, b: number, n: number,
): number {
  let lo = 0, hi = a + b;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const v = Math.pow(Math.abs((px + mid * nx) / a), n) + Math.pow(Math.abs((py + mid * ny) / b), n);
    if (v < 1) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const SUPERELLIPSE_SAMPLES = 720;

export function createStadiumShape(
  viewportWidth: number,
  viewportHeight: number,
  // cornerRadius: 1→n=2 (ellipse/organic), 0→n=20 (near-rectangular)
  { innerRatioX = INNER_RADIUS_RATIO, innerRatioY = INNER_RADIUS_RATIO, shapeX = 1, shapeY = 1, cornerRadius = 0.7 }: StadiumShapeOptions = {},
): TrackShape {
  const n = 2 + (1 - cornerRadius) * 18;

  const outerHalfW = Math.max(1, Math.round(viewportWidth / 2 * shapeX) - DISC_MARGIN);
  const outerHalfH = Math.max(1, Math.round(viewportHeight / 2 * shapeY) - DISC_MARGIN);
  const baseR = Math.max(1, Math.min(outerHalfW, outerHalfH));

  const trackWidthX = Math.max(1, Math.round(baseR * (1 - innerRatioX)));
  const trackWidthY = Math.max(1, Math.round(baseR * (1 - innerRatioY)));
  const innerHalfW = Math.max(1, outerHalfW - trackWidthX);
  const innerHalfH = Math.max(1, outerHalfH - trackWidthY);

  // Build arc-length lookup table along the inner superellipse.
  type SamplePt = { x: number; y: number; nx: number; ny: number; lw: number; cum: number };
  const pts: SamplePt[] = new Array(SUPERELLIPSE_SAMPLES + 1);
  let cum = 0;
  for (let i = 0; i <= SUPERELLIPSE_SAMPLES; i++) {
    const theta = (i / SUPERELLIPSE_SAMPLES) * 2 * Math.PI - Math.PI / 2;
    const { x, y } = superellipseXY(innerHalfW, innerHalfH, n, theta);
    const { nx, ny } = superellipseNormal(innerHalfW, innerHalfH, n, x, y);
    const lw = Math.max(1, superellipseRayDist(x, y, nx, ny, outerHalfW, outerHalfH, n));
    if (i > 0) {
      const dx = x - pts[i - 1].x, dy = y - pts[i - 1].y;
      cum += Math.sqrt(dx * dx + dy * dy);
    }
    pts[i] = { x, y, nx, ny, lw, cum };
  }
  const perimeter = cum;

  function point(t: number) {
    const target = ((t % 1) + 1) % 1 * perimeter;
    let lo = 0, hi = SUPERELLIPSE_SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].cum <= target) lo = mid; else hi = mid;
    }
    const p = pts[lo], q = pts[hi];
    const f = q.cum > p.cum ? (target - p.cum) / (q.cum - p.cum) : 0;
    const nx = p.nx + f * (q.nx - p.nx);
    const ny = p.ny + f * (q.ny - p.ny);
    return {
      x: p.x + f * (q.x - p.x),
      y: p.y + f * (q.y - p.y),
      angleDeg: Math.atan2(ny, nx) * (180 / Math.PI),
      lineWidth: p.lw + f * (q.lw - p.lw),
    };
  }

  function makeSvgPath(a: number, b: number) {
    return (cx: number, cy: number): string => {
      const parts: string[] = [];
      for (let i = 0; i <= 360; i++) {
        const theta = (i / 360) * 2 * Math.PI - Math.PI / 2;
        const { x, y } = superellipseXY(a, b, n, theta);
        parts.push(`${i === 0 ? "M" : "L"}${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`);
      }
      parts.push("Z");
      return parts.join(" ");
    };
  }

  return {
    point,
    perimeter,
    lineWidth: Math.min(trackWidthX, trackWidthY),
    outerWidth: outerHalfW * 2,
    outerHeight: outerHalfH * 2,
    outerBorderRadius: "50%",
    innerWidth: innerHalfW * 2,
    innerHeight: innerHalfH * 2,
    innerBorderRadius: "50%",
    outerGuidePath: makeSvgPath(outerHalfW, outerHalfH),
    innerGuidePath: makeSvgPath(innerHalfW, innerHalfH),
  };
}

export function createEllipseShape(
  viewportWidth: number,
  viewportHeight: number,
  { innerRatioX = INNER_RADIUS_RATIO, innerRatioY = INNER_RADIUS_RATIO, shapeX = 1, shapeY = 1 }: EllipseShapeOptions = {},
): TrackShape {
  const outerA = Math.max(1, Math.round(viewportWidth / 2 * shapeX) - DISC_MARGIN);
  const outerB = Math.max(1, Math.round(viewportHeight / 2 * shapeY) - DISC_MARGIN);
  const base = Math.min(outerA, outerB);
  const trackWidthX = Math.max(1, Math.round(base * (1 - innerRatioX)));
  const trackWidthY = Math.max(1, Math.round(base * (1 - innerRatioY)));
  const innerA = Math.max(1, outerA - trackWidthX);
  const innerB = Math.max(1, outerB - trackWidthY);

  function point(t: number) {
    const angle = ((t % 1) + 1) % 1 * 2 * Math.PI - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const px = innerA * cosA;
    const py = innerB * sinA;
    const gx = cosA / innerA;
    const gy = sinA / innerB;
    const gl = Math.sqrt(gx * gx + gy * gy);
    const nx = gx / gl;
    const ny = gy / gl;
    return {
      x: px,
      y: py,
      angleDeg: Math.atan2(ny, nx) * (180 / Math.PI),
      lineWidth: ellipseRayDist(px, py, nx, ny, outerA, outerB),
    };
  }

  let minLineWidth = Math.min(trackWidthX, trackWidthY);
  let ellipsePerimeter = 0;
  let prevPt = point(0);
  for (let i = 1; i <= 360; i++) {
    const pt = point(i / 360);
    if (pt.lineWidth < minLineWidth) minLineWidth = pt.lineWidth;
    const dx = pt.x - prevPt.x;
    const dy = pt.y - prevPt.y;
    ellipsePerimeter += Math.sqrt(dx * dx + dy * dy);
    prevPt = pt;
  }

  return {
    point,
    perimeter: ellipsePerimeter,
    lineWidth: minLineWidth,
    outerWidth: outerA * 2,
    outerHeight: outerB * 2,
    outerBorderRadius: "50%",
    innerWidth: innerA * 2,
    innerHeight: innerB * 2,
    innerBorderRadius: "50%",
  };
}

export interface WaveShapeOptions {
  scale?: number;
  innerRatioX?: number;
  innerRatioY?: number;
  waveAmplitude?: number; // fraction of track width, 0–0.9
  waveCycles?: number;    // integer number of full sine cycles around the ring
}

// Wave shape: outer boundary is a circle; inner boundary is a sine wave on a circle.
// Each line slot gets a lineWidth = outerR − r_inner(θ), so slots alternate between
// wide (trough, inner boundary close to centre) and narrow (crest, inner boundary
// close to outer ring). Text is wrapped once to the minimum width so it always fits,
// and each slot's CSS width is set to its actual (per-point) lineWidth.
export function createWaveShape(
  viewportWidth: number,
  viewportHeight: number,
  { scale = 1, innerRatioX = INNER_RADIUS_RATIO, innerRatioY = INNER_RADIUS_RATIO, waveAmplitude = 0.35, waveCycles = 4 }: WaveShapeOptions = {},
): TrackShape {
  const outerR = Math.max(1, Math.floor(Math.min(viewportWidth, viewportHeight) / 2 * scale) - DISC_MARGIN);
  const innerRatio = (innerRatioX + innerRatioY) / 2;
  const trackWidth = Math.max(1, Math.round(outerR * (1 - innerRatio)));
  const midInnerR = outerR - trackWidth;
  const cycles = Math.max(1, Math.round(waveCycles));
  const amplitudePx = Math.round(trackWidth * Math.min(Math.abs(waveAmplitude), 0.9));

  // Inner radius at normalised position t ∈ [0, 1)
  function rInner(nt: number): number {
    return midInnerR + amplitudePx * Math.sin(cycles * 2 * Math.PI * nt);
  }

  function point(t: number): { x: number; y: number; angleDeg: number; lineWidth: number } {
    const nt = ((t % 1) + 1) % 1;
    // Angle starts at top (−π/2) and advances clockwise, matching stadium/ellipse convention
    const angle = nt * 2 * Math.PI - Math.PI / 2;
    const ri = rInner(nt);
    return {
      x: ri * Math.cos(angle),
      y: ri * Math.sin(angle),
      // Outward direction is radial for a circular outer boundary
      angleDeg: angle * (180 / Math.PI),
      lineWidth: Math.max(1, outerR - ri),
    };
  }

  // Perimeter of the wavy inner path (numerical integration)
  const SAMPLES = 720;
  let perimeter = 0;
  let prev = point(0);
  for (let i = 1; i <= SAMPLES; i++) {
    const p = point(i / SAMPLES);
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
    prev = p;
  }

  function innerGuidePath(cx: number, cy: number): string {
    const N = 360;
    const parts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const nt = i / N;
      const angle = nt * 2 * Math.PI - Math.PI / 2;
      const ri = rInner(nt);
      const x = (cx + ri * Math.cos(angle)).toFixed(2);
      const y = (cy + ri * Math.sin(angle)).toFixed(2);
      parts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
    }
    parts.push("Z");
    return parts.join(" ");
  }

  return {
    point,
    perimeter,
    lineWidth: trackWidth - amplitudePx,
    outerWidth: outerR * 2,
    outerHeight: outerR * 2,
    outerBorderRadius: "50%",
    innerWidth: midInnerR * 2,
    innerHeight: midInnerR * 2,
    innerBorderRadius: "50%",
    innerGuidePath,
  };
}

function ellipseRayDist(px: number, py: number, nx: number, ny: number, a: number, b: number): number {
  const A = (nx * nx) / (a * a) + (ny * ny) / (b * b);
  const B = 2 * ((px * nx) / (a * a) + (py * ny) / (b * b));
  const C = (px * px) / (a * a) + (py * py) / (b * b) - 1;
  const disc = B * B - 4 * A * C;
  if (disc <= 0) return 0;
  return (-B + Math.sqrt(disc)) / (2 * A);
}


export function getStyle(kind: string): LineStyle {
  return STYLE_BY_KIND[kind] ?? BODY_STYLE;
}

function normalizeInlineText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldInsertSpacer(previous: Block, current: Block): boolean {
  if (!previous) {
    return false;
  }

  if (current.kind === "list-item" && previous.kind === "list-item") {
    return false;
  }

  return true;
}

function createSpacerLine(): ArticleLine {
  return {
    kind: "spacer",
    text: "",
    fontSize: 7,
    weight: 400,
    italic: false,
  };
}
