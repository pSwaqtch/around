import type { TextTrack, WaveTrackOptions } from "./types.js";
import { buildTrack, sampleParametric, pathFromNodes } from "./build.js";
import { offsetNodesByTangent, clamp } from "./math.js";

const DISC_MARGIN = 4;
const DEFAULT_WIDTH_RATIO = 0.9;

export function createWaveTrack(
  viewportWidth: number,
  viewportHeight: number,
  options: WaveTrackOptions = {},
): TextTrack {
  const widthRatio = clamp(options.widthRatio ?? DEFAULT_WIDTH_RATIO, 0.05, 1);
  const amplitudeRatio = clamp(options.amplitudeRatio ?? 0.32, 0.02, 0.9);
  const halfW = Math.max(1, Math.floor(viewportWidth / 2 * widthRatio) - DISC_MARGIN);
  const trackWidth = Math.max(
    1,
    Math.round(Math.min(halfW, viewportHeight / 2) * clamp(options.trackThickness ?? 0.16, 0.03, 0.65)),
  );
  const amplitude = Math.max(1, viewportHeight / 2 * amplitudeRatio - trackWidth);
  const cycles = clamp(options.cycles ?? 2.4, 0.25, 8);
  const nodes = sampleParametric(720, false, (t) => ({
    x: -halfW + halfW * 2 * t,
    y: Math.sin(t * Math.PI * 2 * cycles) * amplitude,
    angleDeg: 0,
    lineWidth: trackWidth,
  }));

  return buildTrack("wave", nodes, false, trackWidth, pathFromNodes(nodes, false), pathFromNodes(offsetNodesByTangent(nodes, trackWidth), false));
}
