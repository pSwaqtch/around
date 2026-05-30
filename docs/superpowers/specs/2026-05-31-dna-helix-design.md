# DNA Helix Shape Design

## Overview

Add a DNA double helix as a new shape option to the radial text layout system. This is the first **open figure** shape (unlike the existing closed shapes: stadium, ellipse, wave, recty). Text will form the base pair connections between two sinusoidal strands, creating a 3D projection effect viewed from the front.

## Visual Specification

### Layout
- **Progression**: Left to right (horizontal, open-ended)
- **Two strands**: Upper and lower sinusoidal curves oscillating in opposite phase
  - Upper strand: starts high, oscillates down then up
  - Lower strand: starts low, oscillates up then down
- **Text placement**: Perpendicular lines connecting the two strands (like DNA base pairs)
- **Text flipping**: Automatically occurs at strand crossings through CSS clipping geometry
  - Text between diverging strands reads normally
  - Text between converging strands (past intersection) reads flipped
  - No explicit text rotation or mirroring needed

### Front-Facing 2D Projection
This is not true 3D—it's a 2D visual representation of a DNA helix viewed head-on, where the oscillating strands and perpendicular angles create the illusion of depth and the crossing effect.

## Implementation Strategy

### TrackShape Implementation (`createDnaHelix()`)

Add to `src/lib/article-layout.ts`:

```typescript
export function createDnaHelix(
  width: number,
  height: number,
  options: DnaHelixOptions
): TrackShape
```

**TrackShape.point(t) returns:**
- `x, y`: Center position between the two strands (text is placed here)
- `angleDeg`: Perpendicular angle connecting the strands
  - Varies as the strands diverge and converge
  - Naturally changes from ~90° to ~-90° as strands rotate relative to viewer
- `lineWidth`: Distance between the two strands (text spans this width)

**Strand Geometry:**
```
centerY = height / 2
amplitude = (height / 2) * dnaAmplitude

upperStrandY(t) = centerY + amplitude * sin(t * π * dnaPitch)
lowerStrandY(t) = centerY - amplitude * sin(t * π * dnaPitch)

textCenterY = (upperStrandY + lowerStrandY) / 2 = centerY (constant)
lineWidth = dnaStrandGap + 2 * amplitude * |cos(t * π * dnaPitch)|
```

The lineWidth varies as strands diverge/converge, controlled by the cosine term.

**Angle Calculation:**
The perpendicular angle between strands changes smoothly, creating the flip effect:
```
angle = atan2(lowerStrandY - upperStrandY, horizontalDistance)
```

As strands cross, this angle inverts, and CSS clipping naturally handles the visual flip.

### CSS Clipping

Text elements use padding-based clipping to create the flip effect:
- `padding-left`: Clips left side of text to upper strand path
- `padding-right`: Clips right side of text to lower strand path
- No need for explicit `transform: scaleX(-1)` or text mirroring

The perpendicular positioning and angle transforms naturally align the clipping with strand geometry.

### Open Figure Handling

Unlike closed shapes (stadium, ellipse, wave, recty):
- **Perimeter**: From left viewport edge to right viewport edge (not a circle/ellipse)
- **No inner/outer rings**: Only two helical strands as SVG guide paths
- **Scroll behavior**: Text flows left-to-right, loops if enabled
- **Viewport**: Text appears and disappears as it enters/exits the left/right edges

### Guide Rendering

Render two SVG paths (upper and lower strands) instead of closed rings:
```typescript
outerGuidePath?(cx: number, cy: number): string // upper strand
innerGuidePath?(cx: number, cy: number): string // lower strand
```

Both paths will be visible simultaneously, showing the helical structure.

## Configuration Parameters

Add to `AppShapeOptions`:

```typescript
dnaPitch: number;        // 2-8, helix tightness (like waveCycles)
dnaAmplitude: number;    // 0.2-0.6, strand oscillation height (like waveAmplitude)
dnaStrandGap: number;    // 60-150px, base gap between strands at center
```

Default values:
```typescript
dnaPitch: 4,
dnaAmplitude: 0.35,
dnaStrandGap: 100,
```

## UI Integration

### Shape Selector
Add "dna" to the `SHAPES` array in `ControlsPanel.tsx`:
```typescript
{ id: "dna", label: "dna" }
```

Update the `activeShape` type to include `"dna"`.

### Control Sliders
When "dna" shape is active, show three sliders:
1. **Pitch** (2–8, step 0.1): Controls helix tightness
2. **Amplitude** (0.2–0.6, step 0.05): Controls vertical oscillation
3. **Strand Gap** (60–150px, step 5): Controls distance between strands

Hide parameters specific to other shapes (cornerRadius, waveAmplitude for stadium, etc.).

## Text Rendering Integration

The existing pretext wrapper and rendering pipeline require **no changes**:
- `shape.point(t)` returns position and angle like all other shapes
- `shape.lineWidth` varies dynamically but is already handled by the renderer
- Text transforms via the standard `lineTransform()` function
- CSS clipping happens naturally through padding and angle positioning

The perpendicular angle from `point(t).angleDeg` drives correct text orientation at each strand crossing point.

## Architecture Fit

**What's new:**
- One new factory function: `createDnaHelix()`
- Three new shape options: `dnaPitch`, `dnaAmplitude`, `dnaStrandGap`
- One new shape type literal: `"dna"`

**What's unchanged:**
- TrackShape interface (already supports variable lineWidth and perpendicular angles)
- Rendering loop (`updateConveyorBelt()`)
- Text wrapping (pretext integration)
- Export system (PNG/SVG)
- Theme and typography system

**Why it works:**
The DNA helix is just another TrackShape implementation. The open-ended left-to-right progression is a natural consequence of how the renderer uses `point(t)` values in the [0, 1] range. No special cases needed.

## Testing Considerations

- Verify text flips correctly at strand crossings
- Confirm lineWidth varies smoothly as strands diverge/converge
- Test with long articles: looping should feel natural
- Export as PNG/SVG to verify visual integrity
- Test with different font sizes and line spacing

## Success Criteria

1. ✓ DNA helix appears as a shape option alongside stadium, ellipse, wave, recty
2. ✓ Text runs perpendicular between strands, creating base-pair visual
3. ✓ Text automatically flips at strand intersections through CSS clipping
4. ✓ Three adjustable sliders control pitch, amplitude, and strand gap
5. ✓ Guide SVG renders both sinusoidal strands
6. ✓ Export (PNG/SVG) preserves the helix layout
7. ✓ No regression in existing shape functionality
