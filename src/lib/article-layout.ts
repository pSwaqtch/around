export type ArticleBlockKind = "heading" | "paragraph" | "list-item" | "quote";
export type ArticleLineKind =
  | ArticleBlockKind
  | "list-continuation"
  | "spacer"
  | "separator";
export type RadialTextAlign = "left" | "right" | "justify";

export interface ArticleBlock {
  kind: ArticleBlockKind;
  text: string;
  level?: number;
}

export interface ArticleLine {
  kind: ArticleLineKind;
  text: string;
  fontSize: number;
  weight: number;
  family: string;
  italic: boolean;
}

export interface PlacedArticleLine extends ArticleLine, TrackPoint {
  _lineIndex: number;
}

export interface TextStyle {
  fontSize: number;
  weight: number;
  family: string;
  italic?: boolean;
}

export interface BuildArticleLinesOptions {
  maxWidth: number;
  wrapText: (text: string, maxWidth: number, style: TextStyle) => string[];
  typography?: ArticleTypography;
}

export type ArticleTypography = Partial<Record<ArticleLineKind, Partial<TextStyle>>>;

export interface DiscGeometry {
  outerRadius: number;
  innerRadius: number;
  lineWidth: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  angleDeg: number;
  lineWidth?: number;
}

export interface TrackShape {
  point: (t: number) => TrackPoint;
  perimeter: number;
  lineWidth: number;
  outerWidth: number;
  outerHeight: number;
  outerBorderRadius: string;
  innerWidth: number;
  innerHeight: number;
  innerBorderRadius: string;
}

export interface ShapeOptions {
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  innerRatio?: number;
  shapeX?: number;
  shapeY?: number;
  cornerRadius?: number;
}

export const DEFAULT_BODY_STYLE = Object.freeze({
  fontSize: 9,
  weight: 400,
  family: "Georgia, serif",
});

const STYLE_BY_KIND = Object.freeze({
  heading: Object.freeze({ fontSize: 11, weight: 700, family: "Georgia, serif" }),
  paragraph: DEFAULT_BODY_STYLE,
  "list-item": DEFAULT_BODY_STYLE,
  "list-continuation": DEFAULT_BODY_STYLE,
  quote: Object.freeze({ fontSize: 9, weight: 400, family: "Georgia, serif", italic: true }),
  spacer: DEFAULT_BODY_STYLE,
  separator: DEFAULT_BODY_STYLE,
});

const DISC_MARGIN = 4;
const INNER_RADIUS_RATIO = 0.44;

const HEADING_MARKER_RE = /^(#{1,6})\s+(.+)$/;
const LIST_MARKER_RE = /^[-*+]\s+(.+)$/;
const NUMBERED_MARKER_RE = /^\d+[.)]\s+(.+)$/;
const QUOTE_MARKER_RE = /^>\s?(.+)$/;
const THEMATIC_BREAK_RE = /^([-*_=])\1{2,}\s*$/;

export function parseArticle(source: string): ArticleBlock[] {
  const normalized = source.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: ArticleBlock[] = [];
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
        text: normalizeInlineText(heading[2] ?? ""),
        level: Math.min(heading[1]?.length ?? 1, 3),
      });
      return;
    }

    const listItem = line.match(LIST_MARKER_RE) ?? line.match(NUMBERED_MARKER_RE);
    if (listItem) {
      flushParagraph();
      blocks.push({
        kind: "list-item",
        text: normalizeInlineText(listItem[1] ?? ""),
      });
      return;
    }

    const quote = line.match(QUOTE_MARKER_RE);
    if (quote) {
      flushParagraph();
      blocks.push({
        kind: "quote",
        text: normalizeInlineText(quote[1] ?? ""),
      });
      return;
    }

    if (THEMATIC_BREAK_RE.test(line)) {
      flushParagraph();
      return;
    }

    const previousLine = index > 0 ? lines[index - 1]?.trim() ?? "" : "";
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

export function buildArticleLines(source: string, options: BuildArticleLinesOptions): ArticleLine[] {
  const maxWidth = options.maxWidth;
  const wrapText = options.wrapText;
  const typography = options.typography;
  const blocks = parseArticle(source);
  const lines: ArticleLine[] = [];

  blocks.forEach((block, index) => {
    const previous = blocks[index - 1];

    if (index > 0 && previous && shouldInsertSpacer(previous, block)) {
      lines.push(createSpacerLine(typography));
    }

    const style = getStyle(block.kind, typography);
    const prefix = block.kind === "list-item" ? "- " : block.kind === "quote" ? '"' : "";
    const suffix = block.kind === "quote" ? '"' : "";
    const wrapped = wrapText(`${prefix}${block.text}${suffix}`, maxWidth, style);

    wrapped.forEach((text, lineIndex) => {
      lines.push({
        kind: lineIndex > 0 && block.kind === "list-item" ? "list-continuation" : block.kind,
        text: lineIndex > 0 && block.kind === "list-item" ? `  ${text}` : text,
        fontSize: style.fontSize,
        weight: style.weight,
        family: style.family,
        italic: Boolean(style.italic),
      });
    });
  });

  return lines;
}

export function layoutCircleLines(lines: ArticleLine[], startAngle = -90) {
  if (lines.length === 0) {
    return [];
  }

  const angleStep = 360 / lines.length;

  return lines.map((line, index) => ({
    ...line,
    angleDeg: startAngle + index * angleStep,
  }));
}

export function calculateDiscGeometry(viewportWidth: number, viewportHeight: number): DiscGeometry {
  const outerRadius = Math.max(1, Math.floor(Math.min(viewportWidth, viewportHeight) / 2) - DISC_MARGIN);
  const innerRadius = Math.max(1, Math.round(outerRadius * INNER_RADIUS_RATIO));

  return {
    outerRadius,
    innerRadius,
    lineWidth: outerRadius - innerRadius,
  };
}

export function calculateScrollStartT(scrollY: number, maxScroll: number, direction = 1): number {
  if (maxScroll <= 0) {
    return scrollY * direction;
  }

  return (scrollY / maxScroll) * direction;
}

export function layoutShapeLines(
  lines: ArticleLine[],
  shape: TrackShape,
  startT = 0,
  minSpacing = 12,
  loop = false,
): Array<PlacedArticleLine | null> {
  if (lines.length === 0) {
    return [];
  }

  const step = minSpacing / shape.perimeter;
  const numSlots = Math.ceil(1 / step) + 1;
  const beltPos = loop
    ? (((startT % 1) + 1) % 1) * lines.length
    : Math.max(0, Math.min(startT, 1)) * lines.length;
  const firstIdx = Math.floor(beltPos);
  const frac = beltPos - firstIdx;
  const result: Array<PlacedArticleLine | null> = [];

  for (let i = 0; i < numSlots; i += 1) {
    const t = (i - frac) * step;
    const lineIndex = loop ? (firstIdx + i) % lines.length : firstIdx + i;

    if (t < 0 || t >= 1 || lineIndex < 0 || lineIndex >= lines.length) {
      result.push(null);
      continue;
    }

    const line = lines[lineIndex];
    const point = shape.point(t);
    result.push({ ...line, ...point, _lineIndex: lineIndex });
  }

  return result;
}

export function createStadiumShape(
  viewportWidth: number,
  viewportHeight: number,
  options: ShapeOptions = {},
): TrackShape {
  const {
    scale = 1,
    innerRatio = INNER_RADIUS_RATIO,
    scaleX,
    scaleY,
    shapeX = 0,
    shapeY = 0,
    cornerRadius = 1,
  } = options;

  if (scaleX !== undefined || scaleY !== undefined) {
    return createAxisScaledStadiumShape(viewportWidth, viewportHeight, {
      scale,
      innerRatio,
      scaleX: scaleX ?? 1,
      scaleY: scaleY ?? 1,
      cornerRadius,
    });
  }

  const baseR = Math.max(1, Math.floor((Math.min(viewportWidth, viewportHeight) / 2) * scale) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(baseR * (1 - innerRatio)));
  const innerRMax = Math.max(1, baseR - trackWidth);
  const outerCornerR = Math.round(baseR * cornerRadius);
  const innerCornerR = Math.max(0, outerCornerR - trackWidth);
  const halfW = Math.floor((viewportWidth / 2) * scale) - DISC_MARGIN;
  const halfH = Math.floor((viewportHeight / 2) * scale) - DISC_MARGIN;
  const maxOffsetX = Math.max(0, halfW - outerCornerR);
  const maxOffsetY = Math.max(0, halfH - outerCornerR);
  const baseOffsetX = Math.round(shapeX * maxOffsetX);
  const baseOffsetY = Math.round(shapeY * maxOffsetY);
  const arcOffsetX = baseOffsetX + (innerRMax - innerCornerR);
  const arcOffsetY = baseOffsetY + (innerRMax - innerCornerR);
  const quarterArc = (Math.PI / 2) * innerCornerR;
  const perimeter = 4 * arcOffsetX + 4 * arcOffsetY + 4 * quarterArc;

  function point(t: number) {
    const s = positiveUnit(t) * perimeter;
    return roundedRectPoint(s, arcOffsetX, arcOffsetY, innerCornerR);
  }

  return {
    point,
    perimeter,
    lineWidth: trackWidth,
    outerWidth: 2 * (baseOffsetX + baseR),
    outerHeight: 2 * (baseOffsetY + baseR),
    outerBorderRadius: `${outerCornerR}px`,
    innerWidth: 2 * (baseOffsetX + innerRMax),
    innerHeight: 2 * (baseOffsetY + innerRMax),
    innerBorderRadius: `${innerCornerR}px`,
  };
}

export function createEllipseShape(
  viewportWidth: number,
  viewportHeight: number,
  options: ShapeOptions = {},
): TrackShape {
  const {
    scale = 1,
    scaleX = 1,
    scaleY = 1,
    innerRatio = INNER_RADIUS_RATIO,
  } = options;
  const outerA = Math.max(1, Math.floor((viewportWidth / 2) * scale * scaleX) - DISC_MARGIN);
  const outerB = Math.max(1, Math.floor((viewportHeight / 2) * scale * scaleY) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(Math.min(outerA, outerB) * (1 - innerRatio)));
  const innerA = Math.max(1, outerA - trackWidth);
  const innerB = Math.max(1, outerB - trackWidth);

  function point(t: number) {
    const angle = positiveUnit(t) * 2 * Math.PI - Math.PI / 2;
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

  for (let i = 1; i <= 360; i += 1) {
    const pt = point(i / 360);
    minLineWidth = Math.min(minLineWidth, pt.lineWidth);
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

export function getStyle(kind: ArticleLineKind, typography?: ArticleTypography): TextStyle {
  const baseStyle = STYLE_BY_KIND[kind] ?? DEFAULT_BODY_STYLE;
  const bodyOverride = typography?.paragraph ?? {};
  const kindOverride = typography?.[kind] ?? {};

  return {
    ...baseStyle,
    ...bodyOverride,
    ...kindOverride,
  };
}

function createAxisScaledStadiumShape(
  viewportWidth: number,
  viewportHeight: number,
  options: Required<Pick<ShapeOptions, "scale" | "innerRatio" | "scaleX" | "scaleY" | "cornerRadius">>,
): TrackShape {
  const outerHalfW = Math.max(1, Math.floor((viewportWidth / 2) * options.scale * options.scaleX) - DISC_MARGIN);
  const outerHalfH = Math.max(1, Math.floor((viewportHeight / 2) * options.scale * options.scaleY) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(Math.min(outerHalfW, outerHalfH) * (1 - options.innerRatio)));
  const innerHalfW = Math.max(1, outerHalfW - trackWidth);
  const innerHalfH = Math.max(1, outerHalfH - trackWidth);
  const outerCornerR = Math.round(Math.min(outerHalfW, outerHalfH) * options.cornerRadius);
  const innerCornerR = Math.max(0, outerCornerR - trackWidth);
  const arcOffsetX = Math.max(0, innerHalfW - innerCornerR);
  const arcOffsetY = Math.max(0, innerHalfH - innerCornerR);
  const quarterArc = (Math.PI / 2) * innerCornerR;
  const perimeter = 4 * arcOffsetX + 4 * arcOffsetY + 4 * quarterArc;

  function point(t: number) {
    const s = positiveUnit(t) * perimeter;
    return roundedRectPoint(s, arcOffsetX, arcOffsetY, innerCornerR);
  }

  return {
    point,
    perimeter,
    lineWidth: trackWidth,
    outerWidth: outerHalfW * 2,
    outerHeight: outerHalfH * 2,
    outerBorderRadius: `${outerCornerR}px`,
    innerWidth: innerHalfW * 2,
    innerHeight: innerHalfH * 2,
    innerBorderRadius: `${innerCornerR}px`,
  };
}

function ellipseRayDist(px: number, py: number, nx: number, ny: number, a: number, b: number) {
  const A = (nx * nx) / (a * a) + (ny * ny) / (b * b);
  const B = 2 * ((px * nx) / (a * a) + (py * ny) / (b * b));
  const C = (px * px) / (a * a) + (py * py) / (b * b) - 1;
  const disc = B * B - 4 * A * C;

  if (disc <= 0) {
    return 0;
  }

  return (-B + Math.sqrt(disc)) / (2 * A);
}

function roundedRectPoint(s: number, arcOffsetX: number, arcOffsetY: number, radius: number): TrackPoint {
  const quarterArc = (Math.PI / 2) * radius;

  if (s < 2 * arcOffsetX) {
    return { x: -arcOffsetX + s, y: -(arcOffsetY + radius), angleDeg: -90 };
  }
  s -= 2 * arcOffsetX;

  if (s < quarterArc) {
    const alpha = -90 + (s / quarterArc) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetY) {
    return { x: arcOffsetX + radius, y: -arcOffsetY + s, angleDeg: 0 };
  }
  s -= 2 * arcOffsetY;

  if (s < quarterArc) {
    const alpha = (s / quarterArc) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetX) {
    return { x: arcOffsetX - s, y: arcOffsetY + radius, angleDeg: 90 };
  }
  s -= 2 * arcOffsetX;

  if (s < quarterArc) {
    const alpha = 90 + (s / quarterArc) * 90;
    const rad = alpha * (Math.PI / 180);
    return { x: -arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetY) {
    return { x: -(arcOffsetX + radius), y: arcOffsetY - s, angleDeg: 180 };
  }
  s -= 2 * arcOffsetY;

  const alpha = 180 + (s / quarterArc) * 90;
  const rad = alpha * (Math.PI / 180);
  return { x: -arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
}

function normalizeInlineText(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldInsertSpacer(previous: ArticleBlock, current: ArticleBlock) {
  if (current.kind === "list-item" && previous.kind === "list-item") {
    return false;
  }

  return true;
}

function createSpacerLine(typography?: ArticleTypography): ArticleLine {
  const style = getStyle("spacer", typography);

  return {
    kind: "spacer",
    text: "",
    fontSize: 7,
    weight: style.weight,
    family: style.family,
    italic: false,
  };
}

function positiveUnit(value: number) {
  return ((value % 1) + 1) % 1;
}
