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
  trackThickness: number;
  textInset: number;
  cornerRadius: number;
  lineSpacing: number;
}

export interface SliderConfig {
  id: keyof DemoOptions;
  label: string;
  min: number;
  max: number;
  step: number;
  display: (value: number) => string;
}

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
    id: "trackThickness",
    label: "track",
    min: 10,
    max: 85,
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

export const INITIAL_DEMO_OPTIONS: DemoOptions = {
  widthRatio: 90,
  heightRatio: 90,
  trackThickness: 56,
  textInset: 6,
  cornerRadius: 100,
  lineSpacing: 12,
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

export function createRadialGeometry(demoOptions: DemoOptions): RadialTextGeometry {
  return {
    widthRatio: demoOptions.widthRatio / 100,
    heightRatio: demoOptions.heightRatio / 100,
    trackThickness: demoOptions.trackThickness / 100,
    cornerRadius: demoOptions.cornerRadius / 100,
  };
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
