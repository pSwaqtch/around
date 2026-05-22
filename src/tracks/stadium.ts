import type { TextTrack, StadiumTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes, resolveGeometry } from "./build.js";
import { roundedRectPoint, offsetNodesByAngle, clamp } from "./math.js";

const DISC_MARGIN = 4;

export function createStadiumTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: StadiumTrackOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const outerHalfW = geometry.outerHalfW;
  const outerHalfH = geometry.outerHalfH;
  const innerHalfW = options.innerWidthRatio != null
    ? Math.max(1, Math.floor(viewportWidth / 2 * clamp(options.innerWidthRatio, 0.05, 1)) - DISC_MARGIN)
    : Math.max(1, outerHalfW - geometry.trackWidth);
  const innerHalfH = options.innerHeightRatio != null
    ? Math.max(1, Math.floor(viewportHeight / 2 * clamp(options.innerHeightRatio, 0.05, 1)) - DISC_MARGIN)
    : Math.max(1, outerHalfH - geometry.trackWidth);
  const trackWidth = Math.min(outerHalfW - innerHalfW, outerHalfH - innerHalfH);
  const radius = Math.min(innerHalfW, innerHalfH) * geometry.cornerRadius;
  const arcOffsetX = Math.max(0, innerHalfW - radius);
  const arcOffsetY = Math.max(0, innerHalfH - radius);
  const nodes = sampleParametric(720, true, (t) => ({
    ...roundedRectPoint(t, arcOffsetX, arcOffsetY, radius),
    lineWidth: trackWidth,
  }));

  return buildTrack("stadium", nodes, true, trackWidth, pathFromNodes(nodes, true), pathFromNodes(offsetNodesByAngle(nodes, trackWidth), true));
}
