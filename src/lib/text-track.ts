export interface TrackLine {
  kind: string;
  text: string;
  fontSize: number;
  weight: number;
  family: string;
  italic: boolean;
}

export interface TrackSample {
  x: number;
  y: number;
  angleDeg: number;
  tangentDeg: number;
  lineWidth: number;
}

export interface PlacedTrackLine extends TrackLine, TrackSample {
  _lineIndex: number;
}

export interface TextTrack {
  kind: string;
  closed: boolean;
  length: number;
  lineWidth: number;
  guidePath: string;
  sampleAt(distance: number): TrackSample;
}

export interface TrackGeometryOptions {
  widthRatio?: number;
  heightRatio?: number;
  trackThickness?: number;
  cornerRadius?: number;
}

export interface SvgPolylineTrackOptions {
  points: Array<[number, number]>;
  trackThickness?: number;
  closed?: boolean;
}

interface TrackNode {
  x: number;
  y: number;
  angleDeg: number;
  tangentDeg: number;
  lineWidth: number;
}

interface PolylineNode extends TrackNode {
  distance: number;
}

const DISC_MARGIN = 4;
const DEFAULT_GEOMETRY = {
  widthRatio: 0.9,
  heightRatio: 0.9,
  trackThickness: 0.56,
  cornerRadius: 1,
};

export function sampleTextTrackLines(
  lines: TrackLine[],
  track: TextTrack,
  startT = 0,
  minSpacing = 12,
  loop = false,
): Array<PlacedTrackLine | null> {
  if (lines.length === 0 || track.length <= 0) {
    return [];
  }

  const numSlots = Math.ceil(track.length / minSpacing) + 1;
  const beltPos = loop
    ? positiveUnit(startT) * lines.length
    : clamp(startT, 0, 1) * lines.length;
  const firstIdx = Math.floor(beltPos);
  const frac = beltPos - firstIdx;
  const result: Array<PlacedTrackLine | null> = [];

  for (let i = 0; i < numSlots; i += 1) {
    const distance = (i - frac) * minSpacing;
    const lineIndex = loop ? (firstIdx + i) % lines.length : firstIdx + i;

    if (distance < 0 || distance >= track.length || lineIndex < 0 || lineIndex >= lines.length) {
      result.push(null);
      continue;
    }

    result.push({
      ...lines[lineIndex],
      ...track.sampleAt(distance),
      _lineIndex: lineIndex,
    });
  }

  return result;
}

export function createStadiumTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: TrackGeometryOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const outerHalfW = geometry.outerHalfW;
  const outerHalfH = geometry.outerHalfH;
  const trackWidth = geometry.trackWidth;
  const innerHalfW = Math.max(1, outerHalfW - trackWidth);
  const innerHalfH = Math.max(1, outerHalfH - trackWidth);
  const radius = Math.min(innerHalfW, innerHalfH) * geometry.cornerRadius;
  const arcOffsetX = Math.max(0, innerHalfW - radius);
  const arcOffsetY = Math.max(0, innerHalfH - radius);
  const nodes = sampleParametric(720, true, (t) => {
    const point = roundedRectPoint(t, arcOffsetX, arcOffsetY, radius);

    return {
      ...point,
      lineWidth: trackWidth,
    };
  });

  return buildTrack("stadium", nodes, true, trackWidth, pathFromNodes(nodes, true));
}

export function createEllipseTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: TrackGeometryOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const outerA = geometry.outerHalfW;
  const outerB = geometry.outerHalfH;
  const trackWidth = geometry.trackWidth;
  const innerA = Math.max(1, outerA - trackWidth);
  const innerB = Math.max(1, outerB - trackWidth);
  const nodes = sampleParametric(960, true, (t) => {
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const x = innerA * cosA;
    const y = innerB * sinA;
    const gx = cosA / innerA;
    const gy = sinA / innerB;
    const gl = Math.hypot(gx, gy) || 1;
    const nx = gx / gl;
    const ny = gy / gl;
    const lineWidth = Math.min(trackWidth, ellipseRayDist(x, y, nx, ny, outerA, outerB));

    return {
      x,
      y,
      angleDeg: Math.atan2(ny, nx) * 180 / Math.PI,
      lineWidth,
    };
  });

  return buildTrack("ellipse", nodes, true, trackWidth, pathFromNodes(nodes, true));
}

export function createSpiralTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: TrackGeometryOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const maxRadius = Math.max(1, Math.min(geometry.outerHalfW, geometry.outerHalfH) - geometry.trackWidth);
  const minRadius = Math.max(24, maxRadius * 0.18);
  const turns = 2.85;
  const thetaMax = turns * Math.PI * 2;
  const nodes = sampleParametric(960, false, (t) => {
    const theta = t * thetaMax - Math.PI / 2;
    const radius = minRadius + (maxRadius - minRadius) * t;

    return {
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      angleDeg: theta * 180 / Math.PI,
      lineWidth: geometry.trackWidth,
    };
  });

  return buildTrack("spiral", nodes, false, geometry.trackWidth, pathFromNodes(nodes, false));
}

export function createWaveTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: TrackGeometryOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const halfW = Math.max(1, geometry.outerHalfW - geometry.trackWidth);
  const amplitude = Math.max(1, geometry.outerHalfH * 0.52 - geometry.trackWidth);
  const cycles = 2.4;
  const nodes = sampleParametric(720, false, (t) => ({
    x: -halfW + halfW * 2 * t,
    y: Math.sin(t * Math.PI * 2 * cycles) * amplitude,
    angleDeg: 0,
    lineWidth: geometry.trackWidth,
  }));

  return buildTrack("wave", nodes, false, geometry.trackWidth, pathFromNodes(nodes, false));
}

export function createBlobTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: TrackGeometryOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const baseA = Math.max(1, geometry.outerHalfW - geometry.trackWidth);
  const baseB = Math.max(1, geometry.outerHalfH - geometry.trackWidth);
  const nodes = sampleParametric(960, true, (t) => {
    const theta = t * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + 0.12 * Math.sin(theta * 3 + 0.6) + 0.08 * Math.sin(theta * 5 - 0.9);

    return {
      x: baseA * wobble * Math.cos(theta),
      y: baseB * wobble * Math.sin(theta),
      angleDeg: theta * 180 / Math.PI,
      lineWidth: geometry.trackWidth,
    };
  });

  return buildTrack("blob", nodes, true, geometry.trackWidth, pathFromNodes(nodes, true));
}

export function createSvgPolylineTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: SvgPolylineTrackOptions,
): TextTrack {
  const trackWidth = Math.max(1, Math.min(viewportWidth, viewportHeight) * (options.trackThickness ?? 0.14));
  const nodes = options.points.map(([x, y]) => ({
    x,
    y,
    angleDeg: 0,
    tangentDeg: 0,
    lineWidth: trackWidth,
  }));

  return buildTrack("svg-path", nodes, Boolean(options.closed), trackWidth, pathFromNodes(nodes, Boolean(options.closed)));
}

function buildTrack(
  kind: string,
  nodes: TrackNode[],
  closed: boolean,
  fallbackLineWidth: number,
  guidePath: string,
): TextTrack {
  const measured = measureNodes(nodes, closed);
  const length = measured.at(-1)?.distance ?? 0;

  return {
    kind,
    closed,
    length,
    lineWidth: fallbackLineWidth,
    guidePath,
    sampleAt(distance: number) {
      if (measured.length === 0) {
        return { x: 0, y: 0, angleDeg: 0, tangentDeg: 0, lineWidth: fallbackLineWidth };
      }

      const target = closed ? positiveModulo(distance, length) : clamp(distance, 0, length);
      let hi = measured.findIndex((node) => node.distance >= target);

      if (hi <= 0) {
        return measured[0];
      }

      const prev = measured[hi - 1];
      const next = measured[hi];
      const span = Math.max(1e-6, next.distance - prev.distance);
      const amount = (target - prev.distance) / span;
      const tangentDeg = angleBetween(prev.x, prev.y, next.x, next.y);

      return {
        x: lerp(prev.x, next.x, amount),
        y: lerp(prev.y, next.y, amount),
        tangentDeg,
        angleDeg: lerpAngle(prev.angleDeg, next.angleDeg, amount),
        lineWidth: lerp(prev.lineWidth, next.lineWidth, amount),
      };
    },
  };
}

function sampleParametric(
  count: number,
  closed: boolean,
  sample: (t: number) => Omit<TrackNode, "tangentDeg">,
): TrackNode[] {
  const points: TrackNode[] = [];
  const end = closed ? count : count - 1;

  for (let i = 0; i <= end; i += 1) {
    const t = i / count;
    const point = sample(t);
    points.push({ ...point, tangentDeg: 0 });
  }

  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangentDeg = angleBetween(prev.x, prev.y, next.x, next.y);
    points[i].tangentDeg = tangentDeg;

    if (!Number.isFinite(points[i].angleDeg)) {
      points[i].angleDeg = tangentDeg - 90;
    }
  }

  return points;
}

function measureNodes(nodes: TrackNode[], closed: boolean): PolylineNode[] {
  if (nodes.length === 0) {
    return [];
  }

  const measured: PolylineNode[] = [{ ...nodes[0], distance: 0 }];
  let distance = 0;
  const limit = closed ? nodes.length : nodes.length - 1;

  for (let i = 1; i <= limit; i += 1) {
    const prev = nodes[i - 1];
    const next = nodes[i % nodes.length];
    distance += Math.hypot(next.x - prev.x, next.y - prev.y);
    measured.push({ ...next, distance });
  }

  return measured;
}

function resolveGeometry(viewportWidth: number, viewportHeight: number, options: TrackGeometryOptions) {
  const widthRatio = clamp(options.widthRatio ?? DEFAULT_GEOMETRY.widthRatio, 0.05, 1);
  const heightRatio = clamp(options.heightRatio ?? DEFAULT_GEOMETRY.heightRatio, 0.05, 1);
  const trackThickness = clamp(options.trackThickness ?? DEFAULT_GEOMETRY.trackThickness, 0.05, 0.9);

  const outerHalfW = Math.max(1, Math.floor(viewportWidth / 2 * widthRatio) - DISC_MARGIN);
  const outerHalfH = Math.max(1, Math.floor(viewportHeight / 2 * heightRatio) - DISC_MARGIN);
  const trackWidth = Math.max(1, Math.round(Math.min(outerHalfW, outerHalfH) * trackThickness));

  return {
    outerHalfW,
    outerHalfH,
    trackWidth,
    cornerRadius: clamp(options.cornerRadius ?? DEFAULT_GEOMETRY.cornerRadius, 0, 1),
  };
}

function roundedRectPoint(t: number, arcOffsetX: number, arcOffsetY: number, radius: number) {
  const perimeter = 4 * arcOffsetX + 4 * arcOffsetY + 2 * Math.PI * radius;
  let s = positiveUnit(t) * perimeter;
  const quarterArc = (Math.PI / 2) * radius;

  if (s < 2 * arcOffsetX) {
    return { x: -arcOffsetX + s, y: -(arcOffsetY + radius), angleDeg: -90 };
  }
  s -= 2 * arcOffsetX;

  if (s < quarterArc) {
    const alpha = -90 + (s / quarterArc) * 90;
    const rad = alpha * Math.PI / 180;
    return { x: arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetY) {
    return { x: arcOffsetX + radius, y: -arcOffsetY + s, angleDeg: 0 };
  }
  s -= 2 * arcOffsetY;

  if (s < quarterArc) {
    const alpha = (s / quarterArc) * 90;
    const rad = alpha * Math.PI / 180;
    return { x: arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetX) {
    return { x: arcOffsetX - s, y: arcOffsetY + radius, angleDeg: 90 };
  }
  s -= 2 * arcOffsetX;

  if (s < quarterArc) {
    const alpha = 90 + (s / quarterArc) * 90;
    const rad = alpha * Math.PI / 180;
    return { x: -arcOffsetX + radius * Math.cos(rad), y: arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
  }
  s -= quarterArc;

  if (s < 2 * arcOffsetY) {
    return { x: -(arcOffsetX + radius), y: arcOffsetY - s, angleDeg: 180 };
  }
  s -= 2 * arcOffsetY;

  const alpha = 180 + (s / quarterArc) * 90;
  const rad = alpha * Math.PI / 180;
  return { x: -arcOffsetX + radius * Math.cos(rad), y: -arcOffsetY + radius * Math.sin(rad), angleDeg: alpha };
}

function ellipseRayDist(px: number, py: number, nx: number, ny: number, a: number, b: number) {
  const A = nx * nx / (a * a) + ny * ny / (b * b);
  const B = 2 * (px * nx / (a * a) + py * ny / (b * b));
  const C = px * px / (a * a) + py * py / (b * b) - 1;
  const disc = B * B - 4 * A * C;

  return disc <= 0 ? 0 : (-B + Math.sqrt(disc)) / (2 * A);
}

function pathFromNodes(nodes: Array<{ x: number; y: number }>, closed: boolean) {
  if (nodes.length === 0) {
    return "";
  }

  const path = [`M ${format(nodes[0].x)} ${format(nodes[0].y)}`];

  for (let i = 1; i < nodes.length; i += 1) {
    path.push(`L ${format(nodes[i].x)} ${format(nodes[i].y)}`);
  }

  if (closed) {
    path.push("Z");
  }

  return path.join(" ");
}

function angleBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  const delta = ((b - a + 540) % 360) - 180;

  return a + delta * t;
}

function positiveUnit(value: number) {
  return positiveModulo(value, 1);
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function format(value: number) {
  return Number(value.toFixed(2));
}
