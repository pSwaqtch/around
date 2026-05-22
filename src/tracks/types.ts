export interface TrackLine {
  kind: string;
  text: string;
  fontSize: number;
  weight: number;
  family: string;
  italic: boolean;
}

export interface TrackSample {
  x: number;
  y: number;
  angleDeg: number;
  tangentDeg: number;
  lineWidth: number;
}

export interface PlacedTrackLine extends TrackLine, TrackSample {
  _lineIndex: number;
}

export interface TextTrack {
  kind: string;
  closed: boolean;
  length: number;
  lineWidth: number;
  guidePath: string;
  outerGuidePath: string;
  sampleAt(distance: number): TrackSample;
}

export interface StadiumTrackOptions {
  widthRatio?: number;
  heightRatio?: number;
  innerWidthRatio?: number;
  innerHeightRatio?: number;
  trackThickness?: number;
  cornerRadius?: number;
}

export interface EllipseTrackOptions {
  widthRatio?: number;
  heightRatio?: number;
  innerWidthRatio?: number;
  innerHeightRatio?: number;
  trackThickness?: number;
}

export interface SpiralTrackOptions {
  scale?: number;
  turns?: number;
  innerRadiusRatio?: number;
  trackThickness?: number;
}

export interface WaveTrackOptions {
  widthRatio?: number;
  amplitudeRatio?: number;
  cycles?: number;
  trackThickness?: number;
}

export interface BlobTrackOptions {
  widthRatio?: number;
  heightRatio?: number;
  wobble?: number;
  lobes?: number;
  trackThickness?: number;
}

export interface SvgPolylineTrackOptions {
  points: Array<[number, number]>;
  scale?: number;
  trackThickness?: number;
  closed?: boolean;
}

export type TrackGeometryOptions = StadiumTrackOptions;

export interface TrackNode {
  x: number;
  y: number;
  angleDeg: number;
  tangentDeg: number;
  lineWidth: number;
}

export interface PolylineNode extends TrackNode {
  distance: number;
}
