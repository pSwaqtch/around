import type {
  RadialTextGeometry,
  RadialTextLayout,
  RadialShapeKind,
  RadialTextTypography,
} from "../components/RadialText/RadialText.js";
import type { RadialTextAlign } from "../lib/article-layout.js";

export type FontPreset = "serif" | "sans" | "mono";

export const SHAPE_OPTIONS: Array<{ id: RadialShapeKind; label: string }> = [
  { id: "stadium", label: "stadium" },
  { id: "ellipse", label: "ellipse" },
  { id: "spiral", label: "spiral" },
  { id: "wave", label: "wave" },
  { id: "blob", label: "blob" },
  { id: "svg-path", label: "path" },
];

export interface DemoOptions {
  widthRatio: number;
  heightRatio: number;
  textInset: number;
  cornerRadius: number;
  lineSpacing: number;
  scale: number;
  turns: number;
  innerRadius: number;
  amplitude: number;
  cycles: number;
  wobble: number;
  lobes: number;
  pathScale: number;
}

export interface SliderConfig {
  id: keyof DemoOptions;
  label: string;
  min: number;
  max: number;
  step: number;
  display: (value: number) => string;
}

const COMMON_LAYOUT_SLIDERS: SliderConfig[] = [
  {
    id: "textInset",
    label: "inset",
    min: 0,
    max: 24,
    step: 1,
    display: (value) => `${value}`,
  },
  {
    id: "lineSpacing",
    label: "spacing",
    min: 8,
    max: 22,
    step: 1,
    display: (value) => `${value}`,
  },
];

const SLIDER_REGISTRY = {
  widthRatio: {
    id: "widthRatio",
    label: "width",
    min: 30,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  heightRatio: {
    id: "heightRatio",
    label: "height",
    min: 30,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  cornerRadius: {
    id: "cornerRadius",
    label: "corner",
    min: 0,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  scale: {
    id: "scale",
    label: "scale",
    min: 30,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  turns: {
    id: "turns",
    label: "turns",
    min: 8,
    max: 70,
    step: 1,
    display: (value) => (value / 10).toFixed(1),
  },
  innerRadius: {
    id: "innerRadius",
    label: "start",
    min: 2,
    max: 70,
    step: 1,
    display: (value) => `${value}`,
  },
  amplitude: {
    id: "amplitude",
    label: "amp",
    min: 4,
    max: 80,
    step: 1,
    display: (value) => `${value}`,
  },
  cycles: {
    id: "cycles",
    label: "cycles",
    min: 4,
    max: 70,
    step: 1,
    display: (value) => (value / 10).toFixed(1),
  },
  wobble: {
    id: "wobble",
    label: "wobble",
    min: 0,
    max: 42,
    step: 1,
    display: (value) => `${value}`,
  },
  lobes: {
    id: "lobes",
    label: "lobes",
    min: 2,
    max: 12,
    step: 1,
    display: (value) => `${value}`,
  },
  pathScale: {
    id: "pathScale",
    label: "scale",
    min: 30,
    max: 180,
    step: 1,
    display: (value) => `${value}`,
  },
} satisfies Partial<Record<keyof DemoOptions, SliderConfig>>;

export const DEMO_SLIDERS: SliderConfig[] = [
  {
    id: "widthRatio",
    label: "width",
    min: 30,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  {
    id: "heightRatio",
    label: "height",
    min: 30,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  {
    id: "textInset",
    label: "inset",
    min: 0,
    max: 24,
    step: 1,
    display: (value) => `${value}`,
  },
  {
    id: "cornerRadius",
    label: "corner",
    min: 0,
    max: 100,
    step: 1,
    display: (value) => `${value}`,
  },
  {
    id: "lineSpacing",
    label: "spacing",
    min: 8,
    max: 22,
    step: 1,
    display: (value) => `${value}`,
  },
];

export function getDemoSliders(shape: RadialShapeKind): SliderConfig[] {
  switch (shape) {
    case "spiral":
      return [
        SLIDER_REGISTRY.scale,
        SLIDER_REGISTRY.turns,
        SLIDER_REGISTRY.innerRadius,
        ...COMMON_LAYOUT_SLIDERS,
      ];
    case "wave":
      return [
        SLIDER_REGISTRY.widthRatio,
        SLIDER_REGISTRY.amplitude,
        SLIDER_REGISTRY.cycles,
        ...COMMON_LAYOUT_SLIDERS,
      ];
    case "blob":
      return [
        SLIDER_REGISTRY.widthRatio,
        SLIDER_REGISTRY.heightRatio,
        SLIDER_REGISTRY.wobble,
        SLIDER_REGISTRY.lobes,
        ...COMMON_LAYOUT_SLIDERS,
      ];
    case "svg-path":
      return [
        SLIDER_REGISTRY.pathScale,
        ...COMMON_LAYOUT_SLIDERS,
      ];
    case "stadium":
    case "ellipse":
      return DEMO_SLIDERS;
  }
}

export const INITIAL_DEMO_OPTIONS: DemoOptions = {
  widthRatio: 90,
  heightRatio: 90,
  textInset: 6,
  cornerRadius: 100,
  lineSpacing: 12,
  scale: 76,
  turns: 29,
  innerRadius: 18,
  amplitude: 32,
  cycles: 24,
  wobble: 16,
  lobes: 5,
  pathScale: 100,
};

export const INITIAL_DEMO_OPTIONS_BY_SHAPE: Record<RadialShapeKind, DemoOptions> = {
  stadium: INITIAL_DEMO_OPTIONS,
  ellipse: INITIAL_DEMO_OPTIONS,
  spiral: {
    ...INITIAL_DEMO_OPTIONS,
    scale: 76,
    turns: 29,
    innerRadius: 18,
  },
  wave: {
    ...INITIAL_DEMO_OPTIONS,
    widthRatio: 90,
    amplitude: 32,
    cycles: 24,
  },
  blob: {
    ...INITIAL_DEMO_OPTIONS,
    widthRatio: 82,
    heightRatio: 78,
    wobble: 16,
    lobes: 5,
  },
  "svg-path": {
    ...INITIAL_DEMO_OPTIONS,
    pathScale: 100,
  },
};

export const FONT_PRESETS: Array<{ id: FontPreset; label: string; typography: RadialTextTypography }> = [
  {
    id: "serif",
    label: "serif",
    typography: {
      fontFamily: "Georgia, serif",
      bodySize: 9,
      headingSize: 11,
      quoteSize: 9,
      bodyWeight: 400,
      headingWeight: 700,
    },
  },
  {
    id: "sans",
    label: "sans",
    typography: {
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      bodySize: 8.5,
      headingSize: 10.5,
      quoteSize: 8.5,
      bodyWeight: 500,
      headingWeight: 700,
    },
  },
  {
    id: "mono",
    label: "mono",
    typography: {
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      bodySize: 8,
      headingSize: 9.5,
      quoteSize: 8,
      bodyWeight: 500,
      headingWeight: 700,
    },
  },
];

export function createRadialGeometry(shape: RadialShapeKind, demoOptions: Partial<DemoOptions>): RadialTextGeometry {
  const defaults = INITIAL_DEMO_OPTIONS_BY_SHAPE[shape];

  switch (shape) {
    case "stadium":
      return {
        stadium: {
          widthRatio: ratio(demoOptions.widthRatio, defaults.widthRatio),
          heightRatio: ratio(demoOptions.heightRatio, defaults.heightRatio),
          cornerRadius: ratio(demoOptions.cornerRadius, defaults.cornerRadius),
        },
      };
    case "ellipse":
      return {
        ellipse: {
          widthRatio: ratio(demoOptions.widthRatio, defaults.widthRatio),
          heightRatio: ratio(demoOptions.heightRatio, defaults.heightRatio),
        },
      };
    case "spiral":
      return {
        spiral: {
          scale: ratio(demoOptions.scale, defaults.scale),
          turns: (demoOptions.turns ?? defaults.turns) / 10,
          innerRadiusRatio: ratio(demoOptions.innerRadius, defaults.innerRadius),
        },
      };
    case "wave":
      return {
        wave: {
          widthRatio: ratio(demoOptions.widthRatio, defaults.widthRatio),
          amplitudeRatio: ratio(demoOptions.amplitude, defaults.amplitude),
          cycles: (demoOptions.cycles ?? defaults.cycles) / 10,
        },
      };
    case "blob":
      return {
        blob: {
          widthRatio: ratio(demoOptions.widthRatio, defaults.widthRatio),
          heightRatio: ratio(demoOptions.heightRatio, defaults.heightRatio),
          wobble: ratio(demoOptions.wobble, defaults.wobble),
          lobes: demoOptions.lobes ?? defaults.lobes,
        },
      };
    case "svg-path":
      return {
        svgPath: {
          scale: ratio(demoOptions.pathScale, defaults.pathScale),
        },
      };
  }
}

export function createRadialLayout(demoOptions: DemoOptions, align: RadialTextAlign): RadialTextLayout {
  return {
    align,
    textInset: demoOptions.textInset,
    lineSpacing: demoOptions.lineSpacing,
  };
}

export function createRadialTypography(fontPreset: FontPreset): RadialTextTypography {
  return FONT_PRESETS.find((preset) => preset.id === fontPreset)?.typography ?? FONT_PRESETS[0].typography;
}

function ratio(value: number | undefined, fallback: number) {
  return (value ?? fallback) / 100;
}
