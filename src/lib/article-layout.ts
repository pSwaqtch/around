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
}

export interface StadiumShapeOptions {
  scale?: number;
  innerRatio?: number;
  shapeX?: number;
  shapeY?: number;
  cornerRadius?: number;
}

export interface EllipseShapeOptions {
  scale?: number;
  innerRatio?: number;
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

export function createStadiumShape(
  viewportWidth: number,
  viewportHeight: number,
  { scale = 1, innerRatio = INNER_RADIUS_RATIO, shapeX = 0, shapeY = 0, cornerRadius = 1 }: StadiumShapeOptions = {},
): TrackShape {
  const baseR = Math.max(1, Math.floor(Math.min(viewportWidth, viewportHeight) / 2 * scale) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(baseR * (1 - innerRatio)));
  const innerRMax = Math.max(1, baseR - trackWidth);

  const outerCornerR = Math.round(baseR * cornerRadius);
  const innerCornerR = Math.max(0, outerCornerR - trackWidth);

  const halfW = Math.floor(viewportWidth / 2 * scale) - DISC_MARGIN;
  const halfH = Math.floor(viewportHeight / 2 * scale) - DISC_MARGIN;
  const maxOffset = Math.max(0, Math.max(halfW, halfH) - outerCornerR);
  const baseOffsetX = Math.round(shapeX * maxOffset);
  const baseOffsetY = Math.round(shapeY * maxOffset);

  const arcOffsetX = baseOffsetX + (innerRMax - innerCornerR);
  const arcOffsetY = baseOffsetY + (innerRMax - innerCornerR);

  const quarterArc = (Math.PI / 2) * innerCornerR;
  const perimeter = 4 * arcOffsetX + 4 * arcOffsetY + 4 * quarterArc;

  function point(t: number) {
    const s = ((t % 1) + 1) % 1 * perimeter;
    return roundedRectPoint(s, arcOffsetX, arcOffsetY, innerCornerR);
  }

  return {
    point,
    perimeter,
    lineWidth: trackWidth,
    outerWidth: 2 * (baseOffsetX + baseR),
    outerHeight: 2 * (baseOffsetY + baseR),
    outerBorderRadius: outerCornerR + "px",
    innerWidth: 2 * (baseOffsetX + innerRMax),
    innerHeight: 2 * (baseOffsetY + innerRMax),
    innerBorderRadius: innerCornerR + "px",
  };
}

export function createEllipseShape(
  viewportWidth: number,
  viewportHeight: number,
  { scale = 1, innerRatio = INNER_RADIUS_RATIO }: EllipseShapeOptions = {},
): TrackShape {
  const outerA = Math.max(1, Math.floor(viewportWidth / 2 * scale) - DISC_MARGIN);
  const outerB = Math.max(1, Math.floor(viewportHeight / 2 * scale) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(Math.min(outerA, outerB) * (1 - innerRatio)));
  const innerA = Math.max(1, outerA - trackWidth);
  const innerB = Math.max(1, outerB - trackWidth);

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
    const lineWidth = Math.min(trackWidth, ellipseRayDist(px, py, nx, ny, outerA, outerB));
    return {
      x: px,
      y: py,
      angleDeg: Math.atan2(ny, nx) * (180 / Math.PI),
      lineWidth,
    };
  }

  let minLineWidth = trackWidth;
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

function ellipseRayDist(px: number, py: number, nx: number, ny: number, a: number, b: number): number {
  const A = (nx * nx) / (a * a) + (ny * ny) / (b * b);
  const B = 2 * ((px * nx) / (a * a) + (py * ny) / (b * b));
  const C = (px * px) / (a * a) + (py * py) / (b * b) - 1;
  const disc = B * B - 4 * A * C;
  if (disc <= 0) return 0;
  return (-B + Math.sqrt(disc)) / (2 * A);
}

function roundedRectPoint(
  s: number,
  arcOffsetX: number,
  arcOffsetY: number,
  radius: number,
): { x: number; y: number; angleDeg: number } {
  const qa = (Math.PI / 2) * radius;

  if (s < 2 * arcOffsetX) {
    return { x: -arcOffsetX + s, y: -(arcOffsetY + radius), angleDeg: -90 };
  }
  s -= 2 * arcOffsetX;

  if (s < qa) {
    const alpha = -90 + (s / qa) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= qa;

  if (s < 2 * arcOffsetY) {
    return { x: arcOffsetX + radius, y: -arcOffsetY + s, angleDeg: 0 };
  }
  s -= 2 * arcOffsetY;

  if (s < qa) {
    const alpha = (s / qa) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= qa;

  if (s < 2 * arcOffsetX) {
    return { x: arcOffsetX - s, y: arcOffsetY + radius, angleDeg: 90 };
  }
  s -= 2 * arcOffsetX;

  if (s < qa) {
    const alpha = 90 + (s / qa) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: -arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= qa;

  if (s < 2 * arcOffsetY) {
    return { x: -(arcOffsetX + radius), y: arcOffsetY - s, angleDeg: 180 };
  }
  s -= 2 * arcOffsetY;

  const alpha = 180 + (s / qa) * 90;
  const rad = alpha * (Math.PI / 180);
  return { x: -arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
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
