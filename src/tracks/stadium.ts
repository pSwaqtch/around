import type { TextTrack, StadiumTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes, resolveGeometry } from "./build.js";
import { roundedRectPoint, clamp } from "./math.js";

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

  const innerRadius = Math.min(innerHalfW, innerHalfH) * geometry.cornerRadius;
  const arcOffsetX = Math.max(0, innerHalfW - innerRadius);
  const arcOffsetY = Math.max(0, innerHalfH - innerRadius);
  const outerRadius = Math.min(outerHalfW, outerHalfH) * geometry.cornerRadius;
  const outerArcOffsetX = Math.max(0, outerHalfW - outerRadius);
  const outerArcOffsetY = Math.max(0, outerHalfH - outerRadius);

  const innerNodes = sampleParametric(720, true, (t) => ({
    ...roundedRectPoint(t, arcOffsetX, arcOffsetY, innerRadius),
    lineWidth: 1,
  }));
  const outerNodes = sampleParametric(720, true, (t) => ({
    ...roundedRectPoint(t, outerArcOffsetX, outerArcOffsetY, outerRadius),
    lineWidth: 1,
  }));

  let minLineWidth = Infinity;
  for (let i = 0; i < innerNodes.length; i++) {
    const lw = Math.max(1, Math.hypot(outerNodes[i].x - innerNodes[i].x, outerNodes[i].y - innerNodes[i].y));
    innerNodes[i].lineWidth = lw;
    if (lw < minLineWidth) minLineWidth = lw;
  }

  return buildTrack("stadium", innerNodes, true, minLineWidth, pathFromNodes(innerNodes, true), pathFromNodes(outerNodes, true));
}
