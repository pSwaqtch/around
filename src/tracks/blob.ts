import type { TextTrack, BlobTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes, resolveGeometry } from "./build.js";
import { offsetNodesByAngle, clamp } from "./math.js";

export function createBlobTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: BlobTrackOptions = {},
): TextTrack {
  const geometry = resolveGeometry(viewportWidth, viewportHeight, options);
  const baseA = Math.max(1, geometry.outerHalfW - geometry.trackWidth);
  const baseB = Math.max(1, geometry.outerHalfH - geometry.trackWidth);
  const wobble = clamp(options.wobble ?? 0.16, 0, 0.45);
  const lobes = Math.max(2, Math.round(clamp(options.lobes ?? 5, 2, 12)));
  const blobInner = sampleParametric(960, true, (t) => {
    const theta = t * Math.PI * 2 - Math.PI / 2;
    const radiusScale = 1
      + wobble * Math.sin(theta * lobes + 0.6)
      + wobble * 0.55 * Math.sin(theta * (lobes + 2) - 0.9);

    return {
      x: baseA * radiusScale * Math.cos(theta),
      y: baseB * radiusScale * Math.sin(theta),
      angleDeg: theta * 180 / Math.PI,
      lineWidth: geometry.trackWidth,
    };
  });
  const blobOuter = offsetNodesByAngle(blobInner, geometry.trackWidth);
  const nodes = blobInner.map((node) => {
    const nearest = blobOuter.reduce((best, o) =>
      Math.hypot(o.x - node.x, o.y - node.y) < Math.hypot(best.x - node.x, best.y - node.y) ? o : best
    );

    return { ...node, lineWidth: Math.hypot(nearest.x - node.x, nearest.y - node.y) };
  });

  return buildTrack("blob", nodes, true, geometry.trackWidth, pathFromNodes(nodes, true), pathFromNodes(blobOuter, true));
}
