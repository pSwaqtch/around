import type { TextTrack, EllipseTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes, resolveGeometry } from "./build.js";
import { offsetNodesByAngle, clamp } from "./math.js";

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
  const trackWidth = Math.min(outerA - innerA, outerB - innerB);
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

    return {
      x,
      y,
      angleDeg: Math.atan2(ny, nx) * 180 / Math.PI,
      lineWidth: trackWidth,
    };
  });

  return buildTrack("ellipse", nodes, true, trackWidth, pathFromNodes(nodes, true), pathFromNodes(offsetNodesByAngle(nodes, trackWidth), true));
}
