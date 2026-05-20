import test from "node:test";
import assert from "node:assert/strict";

import {
  createBlobTrack,
  createEllipseTrack,
  createSpiralTrack,
  createStadiumTrack,
  createSvgPolylineTrack,
  createWaveTrack,
  sampleTextTrackLines,
  type TrackLine,
} from "../src/lib/text-track.js";

import {
  RADIAL_TRACK_FACTORIES,
  type RadialShapeKind,
} from "../src/components/RadialText/RadialText.js";

test("closed tracks can loop sampled lines around the route", () => {
  const track = createEllipseTrack(1000, 600, {
    widthRatio: 0.8,
    heightRatio: 0.7,
    trackThickness: 0.3,
  });
  const lines = createLines(8);

  const placed = sampleTextTrackLines(lines, track, 0.98, 24, true);

  assert.equal(track.closed, true);
  assert(placed.filter(Boolean).length > lines.length);
  assert(placed.every((line) => line === null || line._lineIndex < lines.length));
});

test("open tracks stop at the end unless looping is explicitly allowed", () => {
  const track = createWaveTrack(1000, 600, {
    widthRatio: 0.9,
    heightRatio: 0.45,
    trackThickness: 0.2,
  });
  const lines = createLines(6);

  const placed = sampleTextTrackLines(lines, track, 0.95, 48, false);

  assert.equal(track.closed, false);
  assert(placed.some((line) => line === null));
});

test("new track factories expose finite arc-length samples and guide paths", () => {
  const tracks = [
    createStadiumTrack(1000, 600, { widthRatio: 0.85, heightRatio: 0.75, trackThickness: 0.35, cornerRadius: 0.7 }),
    createEllipseTrack(1000, 600, { widthRatio: 0.85, heightRatio: 0.75, trackThickness: 0.35 }),
    createSpiralTrack(1000, 600, { widthRatio: 0.85, heightRatio: 0.75, trackThickness: 0.22 }),
    createWaveTrack(1000, 600, { widthRatio: 0.85, heightRatio: 0.75, trackThickness: 0.22 }),
    createBlobTrack(1000, 600, { widthRatio: 0.85, heightRatio: 0.75, trackThickness: 0.3 }),
    createSvgPolylineTrack(1000, 600, {
      points: [
        [-400, -120],
        [-120, 80],
        [140, -80],
        [420, 140],
      ],
      trackThickness: 0.18,
    }),
  ];

  for (const track of tracks) {
    const start = track.sampleAt(0);
    const middle = track.sampleAt(track.length / 2);

    assert(Number.isFinite(track.length));
    assert(track.length > 1);
    assert(track.guidePath.startsWith("M"));
    assert(Number.isFinite(start.x));
    assert(Number.isFinite(start.y));
    assert(Number.isFinite(start.angleDeg));
    assert(Number.isFinite(middle.lineWidth));
    assert(middle.lineWidth > 0);
  }
});

test("RadialText exposes the extended track shape registry", () => {
  const expected: RadialShapeKind[] = ["stadium", "ellipse", "spiral", "wave", "blob", "svg-path"];

  assert.deepEqual(Object.keys(RADIAL_TRACK_FACTORIES), expected);
});

function createLines(count: number): TrackLine[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: "paragraph",
    text: `Line ${index + 1}`,
    fontSize: 9,
    weight: 400,
    family: "Georgia, serif",
    italic: false,
  }));
}
