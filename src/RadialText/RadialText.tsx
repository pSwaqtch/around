import { useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
import "./RadialText.css";

import {
  buildArticleLines,
  calculateScrollStartT,
  getStyle,
  type ArticleLine,
  type ArticleTypography,
  type RadialTextAlign,
} from "../layout/index.js";
import { createPretextWrapper, fillLine } from "../layout/wrap.js";
import {
  createBlobTrack,
  createEllipseTrack,
  createSpiralTrack,
  createStadiumTrack,
  createSvgPolylineTrack,
  createWaveTrack,
  sampleTextTrackLines,
  type BlobTrackOptions,
  type EllipseTrackOptions,
  type SpiralTrackOptions,
  type StadiumTrackOptions,
  type SvgPolylineTrackOptions,
  type TextTrack,
  type WaveTrackOptions,
} from "../tracks/index.js";

export type RadialShapeKind = "stadium" | "ellipse" | "spiral" | "wave" | "blob" | "svg-path";

export interface RadialTextGeometry {
  stadium?: StadiumTrackOptions;
  ellipse?: EllipseTrackOptions;
  spiral?: SpiralTrackOptions;
  wave?: WaveTrackOptions;
  blob?: BlobTrackOptions;
  svgPath?: Partial<SvgPolylineTrackOptions>;
}

export interface RadialTextLayout {
  align?: RadialTextAlign;
  textInset?: number;
  lineSpacing?: number;
  minScrollHeightVh?: number;
  linesPerViewport?: number;
}

export interface RadialTextTypography {
  fontFamily?: string;
  bodySize?: number;
  headingSize?: number;
  quoteSize?: number;
  bodyWeight?: number;
  headingWeight?: number;
}

/** Imperative handle exposed to parent components for export. */
export interface RadialTextHandle {
  /** The viewport-filling disc element — pass directly to html2canvas. */
  discEl: HTMLDivElement;
  /** The component root element — carries the `radialText--guides` class. */
  rootEl: HTMLDivElement;
}

export interface RadialTextProps {
  text: string;
  shape?: RadialShapeKind;
  loop?: boolean;
  geometry?: RadialTextGeometry;
  layout?: RadialTextLayout;
  typography?: RadialTextTypography;
  className?: string;
  showGuides?: boolean;
  discBg?: string;
  textColor?: string;
  /** Optional ref to receive imperative access to disc and root elements. */
  ref?: Ref<RadialTextHandle>;
}

interface ResolvedRadialTextGeometry {
  stadium: StadiumTrackOptions;
  ellipse: EllipseTrackOptions;
  spiral: SpiralTrackOptions;
  wave: WaveTrackOptions;
  blob: BlobTrackOptions;
  svgPath: SvgPolylineTrackOptions;
}

interface ResolvedRadialTextConfig {
  geometry: ResolvedRadialTextGeometry;
  typography: ArticleTypography;
  align: RadialTextAlign;
  textInset: number;
  lineSpacing: number;
  minScrollHeightVh: number;
  linesPerViewport: number;
}

const DEFAULT_GEOMETRY = {
  stadium: {
    widthRatio: 0.9,
    heightRatio: 0.9,
    trackThickness: 0.56,
    cornerRadius: 1,
  },
  ellipse: {
    widthRatio: 0.9,
    heightRatio: 0.9,
    trackThickness: 0.56,
  },
  spiral: {
    scale: 0.76,
    turns: 2.85,
    innerRadiusRatio: 0.18,
    trackThickness: 0.18,
  },
  wave: {
    widthRatio: 0.9,
    amplitudeRatio: 0.32,
    cycles: 2.4,
    trackThickness: 0.16,
  },
  blob: {
    widthRatio: 0.82,
    heightRatio: 0.78,
    wobble: 0.16,
    lobes: 5,
    trackThickness: 0.2,
  },
  svgPath: {
    points: [
      [-420, -120],
      [-180, 110],
      [120, -90],
      [430, 130],
    ],
    scale: 1,
    trackThickness: 0.16,
    closed: false,
  },
} satisfies Required<RadialTextGeometry>;

const DEFAULT_LAYOUT = {
  align: "left",
  textInset: 6,
  lineSpacing: 12,
  minScrollHeightVh: 260,
  linesPerViewport: 80,
} satisfies Required<RadialTextLayout>;

const DEFAULT_TYPOGRAPHY = {
  fontFamily: "Georgia, serif",
  bodySize: 9,
  headingSize: 11,
  quoteSize: 9,
  bodyWeight: 400,
  headingWeight: 700,
} satisfies Required<RadialTextTypography>;

export const RADIAL_TRACK_FACTORIES: Record<
  RadialShapeKind,
  (width: number, height: number, config: ResolvedRadialTextConfig) => TextTrack
> = {
  stadium: createStadiumShape,
  ellipse: createEllipseShape,
  spiral: createSpiralShape,
  wave: createWaveShape,
  blob: createBlobShape,
  "svg-path": createSvgPathShape,
};

export function RadialText({
  text,
  shape = "stadium",
  loop = false,
  geometry,
  layout,
  typography,
  className,
  showGuides = true,
  discBg,
  textColor,
  ref,
}: RadialTextProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const guideSvgRef = useRef<SVGSVGElement | null>(null);
  const guidePathRef = useRef<SVGPathElement | null>(null);
  const outerGuidePathRef = useRef<SVGPathElement | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      get discEl() {
        if (!discRef.current) throw new Error("RadialText disc not mounted");
        return discRef.current;
      },
      get rootEl() {
        if (!rootRef.current) throw new Error("RadialText root not mounted");
        return rootRef.current;
      },
    }),
    [],
  );

  const [scrollHeightVh, setScrollHeightVh] = useState(DEFAULT_LAYOUT.minScrollHeightVh);
  const resolvedConfig = useMemo(
    () => resolveRadialTextConfig(geometry, layout, typography),
    [geometry, layout, typography],
  );
  const rootClassName = [
    "radialText",
    showGuides ? "radialText--guides" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--radial-scroll-height": `${scrollHeightVh}vh`,
  } as CSSProperties;

  useEffect(() => {
    const disc = discRef.current;
    const guideSvg = guideSvgRef.current;
    const guidePath = guidePathRef.current;
    const outerGuidePath = outerGuidePathRef.current;

    if (!disc || !guideSvg || !guidePath || !outerGuidePath || typeof window === "undefined") {
      return undefined;
    }

    const discElement = disc;
    const guideSvgElement = guideSvg;
    const guidePathElement = guidePath;
    const outerGuidePathElement = outerGuidePath;
const wrapText = createPretextWrapper();
    let disposed = false;
    let articleLines: ArticleLine[] = [];
    let lineElements: HTMLDivElement[] = [];
    let prevLineIndices: Array<number | undefined> = [];
    let activeTrack = createTrack(shape, resolvedConfig);
    let latestScrollY = window.scrollY;
    let tickFrame = 0;
    let resizeFrame = 0;
    let ticking = false;

    function createTrack(kind: RadialShapeKind, config: ResolvedRadialTextConfig) {
      return RADIAL_TRACK_FACTORIES[kind](window.innerWidth, window.innerHeight, config);
    }

    function applyGeometry() {
      activeTrack = createTrack(shape, resolvedConfig);
      guideSvgElement.setAttribute(
        "viewBox",
        `${-window.innerWidth / 2} ${-window.innerHeight / 2} ${window.innerWidth} ${window.innerHeight}`,
      );
      guidePathElement.setAttribute("d", activeTrack.guidePath);
      outerGuidePathElement.setAttribute("d", activeTrack.outerGuidePath);

    }

    function buildLines() {
      const maxWidth = Math.max(1, activeTrack.lineWidth - resolvedConfig.textInset * 2);
      const separatorStyle = getStyle("separator", resolvedConfig.typography);
      const separatorText = fillLine("=", maxWidth, separatorStyle);

      articleLines = buildArticleLines(text, {
        maxWidth,
        wrapText,
        typography: resolvedConfig.typography,
      });
      articleLines.push({
        kind: "separator",
        text: separatorText,
        fontSize: separatorStyle.fontSize,
        weight: separatorStyle.weight,
        family: separatorStyle.family,
        italic: false,
      });

      const nextScrollHeight = Math.max(
        resolvedConfig.minScrollHeightVh,
        Math.ceil(articleLines.length / resolvedConfig.linesPerViewport) * 100,
      );

      if (!disposed) {
        setScrollHeightVh(nextScrollHeight);
      }
    }

    function renderRadial() {
      const numSlots = Math.ceil(activeTrack.length / resolvedConfig.lineSpacing) + 1;

      discElement.querySelectorAll(".radialText__line").forEach((element) => element.remove());
      lineElements = [];
      prevLineIndices = [];

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < numSlots; i += 1) {
        const line = document.createElement("div");
        line.className = "radialText__line";
        line.style.visibility = "hidden";
        lineElements.push(line);
        fragment.appendChild(line);
      }

      discElement.appendChild(fragment);
      updateConveyorBelt();
    }

    function updateConveyorBelt() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const startT = calculateScrollStartT(latestScrollY, maxScroll, 1);
      const placed = sampleTextTrackLines(
        articleLines,
        activeTrack,
        startT,
        resolvedConfig.lineSpacing,
        loop && activeTrack.closed,
      );
      const isJustify = resolvedConfig.align === "justify";

      for (let i = 0; i < lineElements.length; i += 1) {
        const element = lineElements[i];
        const line = placed[i];

        if (!element) {
          continue;
        }

        if (!line) {
          element.style.visibility = "hidden";
          continue;
        }

        element.style.visibility = "";
        element.style.transform = lineTransform(line);

        if (line._lineIndex !== prevLineIndices[i]) {
          element.className = `radialText__line radialText__line--${line.kind}`;
          element.textContent = line.text;
          element.style.width = `${line.lineWidth}px`;
          element.style.fontSize = `${line.fontSize}px`;
          element.style.fontWeight = String(line.weight);
          element.style.fontFamily = line.family;
          element.style.fontStyle = line.italic ? "italic" : "normal";
          element.style.paddingLeft = `${resolvedConfig.textInset}px`;
          element.style.paddingRight = `${resolvedConfig.textInset}px`;
          element.style.textAlign = isJustify ? "justify" : resolvedConfig.align;
          element.style.textAlignLast = isJustify ? "justify" : "";
          prevLineIndices[i] = line._lineIndex;
        }
      }

      ticking = false;
    }

    function requestConveyorUpdate() {
      latestScrollY = window.scrollY;

      if (!ticking) {
        tickFrame = window.requestAnimationFrame(updateConveyorBelt);
        ticking = true;
      }
    }

    function rebuild() {
      applyGeometry();
      buildLines();
      renderRadial();
    }

    function requestRebuild() {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(rebuild);
    }

    if (text.trim()) {
      rebuild();
    } else {
      discElement.querySelectorAll(".radialText__line").forEach((element) => element.remove());
setScrollHeightVh(resolvedConfig.minScrollHeightVh);
    }

    window.addEventListener("scroll", requestConveyorUpdate, { passive: true });
    window.addEventListener("resize", requestRebuild);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", requestConveyorUpdate);
      window.removeEventListener("resize", requestRebuild);
      window.cancelAnimationFrame(tickFrame);
      window.cancelAnimationFrame(resizeFrame);
      discElement.querySelectorAll(".radialText__line").forEach((element) => element.remove());

    };
  }, [
    geometry,
    layout,
    loop,
    shape,
    text,
    typography,
    resolvedConfig,
  ]);

  return (
    <div className={rootClassName} style={style} ref={rootRef}>
      <div
        className="radialText__disc"
        ref={discRef}
        style={{
          ...(discBg != null ? { background: discBg } : {}),
          "--radial-text-color": textColor,
        } as CSSProperties}
      >
        <svg className="radialText__guides" ref={guideSvgRef} aria-hidden="true">
          <path className="radialText__guidePath radialText__guidePath--outer" ref={outerGuidePathRef} />
          <path className="radialText__guidePath" ref={guidePathRef} />
        </svg>
      </div>
      <div className="radialText__scrollSpacer" aria-hidden="true" />
    </div>
  );
}


function lineTransform(line: { x: number; y: number; fontSize: number; angleDeg: number }) {
  const pivotAdjY = line.y - line.fontSize / 2;

  return `translate(${line.x}px, ${pivotAdjY}px) rotate(${line.angleDeg}deg)`;
}


function resolveRadialTextConfig(
  geometry: RadialTextGeometry | undefined,
  layout: RadialTextLayout | undefined,
  typography: RadialTextTypography | undefined,
): ResolvedRadialTextConfig {
  const fontFamily = typography?.fontFamily ?? DEFAULT_TYPOGRAPHY.fontFamily;
  const bodySize = Math.max(1, typography?.bodySize ?? DEFAULT_TYPOGRAPHY.bodySize);
  const headingSize = Math.max(1, typography?.headingSize ?? DEFAULT_TYPOGRAPHY.headingSize);
  const quoteSize = Math.max(1, typography?.quoteSize ?? DEFAULT_TYPOGRAPHY.quoteSize);
  const bodyWeight = Math.max(1, typography?.bodyWeight ?? DEFAULT_TYPOGRAPHY.bodyWeight);
  const headingWeight = Math.max(1, typography?.headingWeight ?? DEFAULT_TYPOGRAPHY.headingWeight);

  return {
    geometry: {
      stadium: { ...DEFAULT_GEOMETRY.stadium, ...geometry?.stadium },
      ellipse: { ...DEFAULT_GEOMETRY.ellipse, ...geometry?.ellipse },
      spiral: { ...DEFAULT_GEOMETRY.spiral, ...geometry?.spiral },
      wave: { ...DEFAULT_GEOMETRY.wave, ...geometry?.wave },
      blob: { ...DEFAULT_GEOMETRY.blob, ...geometry?.blob },
      svgPath: { ...DEFAULT_GEOMETRY.svgPath, ...geometry?.svgPath },
    },
    typography: {
      paragraph: { family: fontFamily, fontSize: bodySize, weight: bodyWeight },
      "list-item": { family: fontFamily, fontSize: bodySize, weight: bodyWeight },
      "list-continuation": { family: fontFamily, fontSize: bodySize, weight: bodyWeight },
      spacer: { family: fontFamily, fontSize: bodySize, weight: bodyWeight },
      separator: { family: fontFamily, fontSize: bodySize, weight: bodyWeight },
      quote: { family: fontFamily, fontSize: quoteSize, weight: bodyWeight, italic: true },
      heading: { family: fontFamily, fontSize: headingSize, weight: headingWeight },
    },
    align: layout?.align ?? DEFAULT_LAYOUT.align,
    textInset: Math.max(0, layout?.textInset ?? DEFAULT_LAYOUT.textInset),
    lineSpacing: Math.max(4, layout?.lineSpacing ?? DEFAULT_LAYOUT.lineSpacing),
    minScrollHeightVh: Math.max(100, layout?.minScrollHeightVh ?? DEFAULT_LAYOUT.minScrollHeightVh),
    linesPerViewport: Math.max(1, layout?.linesPerViewport ?? DEFAULT_LAYOUT.linesPerViewport),
  };
}

function createStadiumShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createStadiumTrack(width, height, config.geometry.stadium);
}

function createEllipseShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createEllipseTrack(width, height, config.geometry.ellipse);
}

function createSpiralShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createSpiralTrack(width, height, config.geometry.spiral);
}

function createWaveShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createWaveTrack(width, height, config.geometry.wave);
}

function createBlobShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createBlobTrack(width, height, config.geometry.blob);
}

function createSvgPathShape(width: number, height: number, config: ResolvedRadialTextConfig) {
  return createSvgPolylineTrack(width, height, config.geometry.svgPath);
}
