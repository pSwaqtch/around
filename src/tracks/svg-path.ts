import type { TextTrack, SvgPolylineTrackOptions, TrackNode } from "./types.js";
import { buildTrack, pathFromNodes } from "./build.js";
import { offsetNodesByTangent, withPolylineTangents, clamp } from "./math.js";

export function createSvgPolylineTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: SvgPolylineTrackOptions,
): TextTrack {
  const trackWidth = Math.max(1, Math.min(viewportWidth, viewportHeight) * (options.trackThickness ?? 0.14));
  const scale = clamp(options.scale ?? 1, 0.05, 4);
  const nodes = withPolylineTangents(options.points.map(([x, y]): TrackNode => ({
    x: x * scale,
    y: y * scale,
    angleDeg: 0,
    tangentDeg: 0,
    lineWidth: trackWidth,
  })), Boolean(options.closed));

  return buildTrack(
    "svg-path",
    nodes,
    Boolean(options.closed),
    trackWidth,
    pathFromNodes(nodes, Boolean(options.closed)),
    pathFromNodes(offsetNodesByTangent(nodes, trackWidth), Boolean(options.closed)),
  );
}
