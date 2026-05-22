import type { TextTrack, TrackLine, PlacedTrackLine, TrackNode, PolylineNode, TrackGeometryOptions } from "./types.js";
import { clamp, lerp, lerpAngle, angleBetween, positiveModulo, positiveUnit, format, offsetNodesByAngle } from "./math.js";

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

  const usableLength = track.closed ? track.length - minSpacing : track.length;
  const numSlots = Math.ceil(usableLength / minSpacing) + 1;
  const beltPos = loop
    ? positiveUnit(startT) * lines.length
    : clamp(startT, 0, 1) * lines.length;
  const firstIdx = Math.floor(beltPos);
  const frac = beltPos - firstIdx;
  const result: Array<PlacedTrackLine | null> = [];

  for (let i = 0; i < numSlots; i += 1) {
    const distance = (i - frac) * minSpacing;
    const lineIndex = loop ? (firstIdx + i) % lines.length : firstIdx + i;

    if (distance < 0 || distance >= usableLength || lineIndex < 0 || lineIndex >= lines.length) {
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

export function buildTrack(
  kind: string,
  nodes: TrackNode[],
  closed: boolean,
  fallbackLineWidth: number,
  guidePath: string,
  outerGuidePath: string,
): TextTrack {
  const measured = measureNodes(nodes, closed);
  const length = measured.at(-1)?.distance ?? 0;

  return {
    kind,
    closed,
    length,
    lineWidth: fallbackLineWidth,
    guidePath,
    outerGuidePath,
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

export function sampleParametric(
  count: number,
  closed: boolean,
  sample: (t: number, i: number) => Omit<TrackNode, "tangentDeg">,
): TrackNode[] {
  const points: TrackNode[] = [];
  const end = closed ? count : count - 1;

  for (let i = 0; i <= end; i += 1) {
    const t = i / count;
    const point = sample(t, i);
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

export function measureNodes(nodes: TrackNode[], closed: boolean): PolylineNode[] {
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

export function pathFromNodes(nodes: Array<{ x: number; y: number }>, closed: boolean) {
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

export function resolveGeometry(viewportWidth: number, viewportHeight: number, options: TrackGeometryOptions) {
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
