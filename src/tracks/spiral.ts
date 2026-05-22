import type { TextTrack, SpiralTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes } from "./build.js";
import { offsetNodesByAngle, clamp } from "./math.js";

const DISC_MARGIN = 4;
const DEFAULT_WIDTH_RATIO = 0.9;

export function createSpiralTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: SpiralTrackOptions = {},
): TextTrack {
  const scale = clamp(options.scale ?? DEFAULT_WIDTH_RATIO, 0.05, 1);
  const outerRadius = Math.max(1, Math.floor(Math.min(viewportWidth, viewportHeight) / 2 * scale) - DISC_MARGIN);
  const trackThickness = clamp(options.trackThickness ?? 0.18, 0.03, 0.65);
  const trackWidth = Math.max(1, Math.round(outerRadius * trackThickness));
  const maxRadius = Math.max(1, outerRadius - trackWidth);
  const innerRadiusRatio = clamp(options.innerRadiusRatio ?? 0.18, 0.02, 0.8);
  const minRadius = Math.max(1, maxRadius * innerRadiusRatio);
  const turns = clamp(options.turns ?? 2.85, 0.5, 8);
  const thetaMax = turns * Math.PI * 2;
  const nodes = sampleParametric(960, false, (t) => {
    const theta = t * thetaMax - Math.PI / 2;
    const radius = minRadius + (maxRadius - minRadius) * t;

    return {
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      angleDeg: theta * 180 / Math.PI,
      lineWidth: trackWidth,
    };
  });

  return buildTrack("spiral", nodes, false, trackWidth, pathFromNodes(nodes, false), pathFromNodes(offsetNodesByAngle(nodes, trackWidth), false));
}
