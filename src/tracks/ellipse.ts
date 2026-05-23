import type { TextTrack, EllipseTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes, resolveGeometry } from "./build.js";
import { clamp } from "./math.js";

const DISC_MARGIN = 4;

export function createEllipseTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: EllipseTrackOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const outerA = geometry.outerHalfW;
  const outerB = geometry.outerHalfH;
  const innerA = options.innerWidthRatio != null
    ? Math.max(1, Math.floor(viewportWidth / 2 * clamp(options.innerWidthRatio, 0.05, 1)) - DISC_MARGIN)
    : Math.max(1, outerA - geometry.trackWidth);
  const innerB = options.innerHeightRatio != null
    ? Math.max(1, Math.floor(viewportHeight / 2 * clamp(options.innerHeightRatio, 0.05, 1)) - DISC_MARGIN)
    : Math.max(1, outerB - geometry.trackWidth);

  const ellipseNodes = (rx: number, ry: number) => sampleParametric(960, true, (t) => {
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const gx = cosA / rx;
    const gy = sinA / ry;
    const gl = Math.hypot(gx, gy) || 1;
    return {
      x: rx * cosA,
      y: ry * sinA,
      angleDeg: Math.atan2(gy / gl, gx / gl) * 180 / Math.PI,
      lineWidth: 1,
    };
  });

  const innerNodes = ellipseNodes(innerA, innerB);
  const outerNodes = ellipseNodes(outerA, outerB);

  let minLineWidth = Infinity;
  for (let i = 0; i < innerNodes.length; i++) {
    const lw = Math.max(1, Math.hypot(outerNodes[i].x - innerNodes[i].x, outerNodes[i].y - innerNodes[i].y));
    innerNodes[i].lineWidth = lw;
    if (lw < minLineWidth) minLineWidth = lw;
  }

  return buildTrack("ellipse", innerNodes, true, minLineWidth, pathFromNodes(innerNodes, true), pathFromNodes(outerNodes, true));
}
