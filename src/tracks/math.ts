import type { TrackNode } from "./types.js";

export function roundedRectPoint(t: number, arcOffsetX: number, arcOffsetY: number, radius: number) {
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

export function offsetNodesByAngle(nodes: TrackNode[], distance: number): TrackNode[] {
  return nodes.map((node) => {
    const angle = node.angleDeg * Math.PI / 180;

    return {
      ...node,
      x: node.x + Math.cos(angle) * distance,
      y: node.y + Math.sin(angle) * distance,
    };
  });
}

export function offsetNodesByTangent(nodes: TrackNode[], distance: number): TrackNode[] {
  return nodes.map((node) => {
    const angle = (node.tangentDeg + 90) * Math.PI / 180;

    return {
      ...node,
      x: node.x + Math.cos(angle) * distance,
      y: node.y + Math.sin(angle) * distance,
    };
  });
}

export function withPolylineTangents(nodes: TrackNode[], closed: boolean): TrackNode[] {
  return nodes.map((node, index) => {
    const prev = nodes[index - 1] ?? (closed ? nodes.at(-1) : node);
    const next = nodes[index + 1] ?? (closed ? nodes[0] : node);
    const tangentDeg = prev && next ? angleBetween(prev.x, prev.y, next.x, next.y) : 0;

    return {
      ...node,
      tangentDeg,
      angleDeg: tangentDeg + 90,
    };
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number) {
  const delta = ((b - a + 540) % 360) - 180;

  return a + delta * t;
}

export function angleBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

export function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

export function positiveUnit(value: number) {
  return positiveModulo(value, 1);
}

export function format(value: number) {
  return Number(value.toFixed(2));
}
