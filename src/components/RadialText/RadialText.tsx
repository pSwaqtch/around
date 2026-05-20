import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  buildArticleLines,
  calculateScrollStartT,
  createEllipseShape,
  createStadiumShape,
  getStyle,
  layoutShapeLines,
  type ArticleLine,
  type ArticleTypography,
  type RadialTextAlign,
  type ShapeOptions,
  type TrackShape,
} from "../../lib/article-layout.js";
import { createPretextWrapper, fillLine } from "../../lib/pretext-wrap.js";

export type RadialShapeKind = "stadium" | "ellipse";

export interface RadialTextGeometry {
  widthRatio?: number;
  heightRatio?: number;
  trackThickness?: number;
  cornerRadius?: number;
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

export interface RadialTextProps {
  text: string;
  shape?: RadialShapeKind;
  loop?: boolean;
  geometry?: RadialTextGeometry;
  layout?: RadialTextLayout;
  typography?: RadialTextTypography;
  className?: string;
  showGuides?: boolean;
}

interface ResolvedRadialTextConfig {
  shapeOptions: ShapeOptions;
  typography: ArticleTypography;
  align: RadialTextAlign;
  textInset: number;
  lineSpacing: number;
  minScrollHeightVh: number;
  linesPerViewport: number;
}

const DEFAULT_GEOMETRY = {
  widthRatio: 0.9,
  heightRatio: 0.9,
  trackThickness: 0.56,
  cornerRadius: 1,
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

const SHAPE_FACTORIES: Record<RadialShapeKind, (width: number, height: number, options: ShapeOptions) => TrackShape> = {
  stadium: createStadiumShape,
  ellipse: createEllipseShape,
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
}: RadialTextProps) {
  const discRef = useRef<HTMLDivElement | null>(null);
  const outerRingRef = useRef<HTMLDivElement | null>(null);
  const innerRingRef = useRef<HTMLDivElement | null>(null);
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
    const outerRing = outerRingRef.current;
    const innerRing = innerRingRef.current;

    if (!disc || !outerRing || !innerRing || typeof window === "undefined") {
      return undefined;
    }

    const discElement = disc;
    const outerRingElement = outerRing;
    const innerRingElement = innerRing;
    const wrapText = createPretextWrapper();
    let disposed = false;
    let articleLines: ArticleLine[] = [];
    let lineElements: HTMLDivElement[] = [];
    let prevLineIndices: Array<number | undefined> = [];
    let activeShape = createShape(shape, resolvedConfig);
    let latestScrollY = window.scrollY;
    let tickFrame = 0;
    let resizeFrame = 0;
    let ticking = false;

    function createShape(kind: RadialShapeKind, config: ResolvedRadialTextConfig) {
      return SHAPE_FACTORIES[kind](window.innerWidth, window.innerHeight, config.shapeOptions);
    }

    function applyGeometry() {
      activeShape = createShape(shape, resolvedConfig);

      outerRingElement.style.width = `${activeShape.outerWidth}px`;
      outerRingElement.style.height = `${activeShape.outerHeight}px`;
      outerRingElement.style.borderRadius = activeShape.outerBorderRadius;
      innerRingElement.style.width = `${activeShape.innerWidth}px`;
      innerRingElement.style.height = `${activeShape.innerHeight}px`;
      innerRingElement.style.borderRadius = activeShape.innerBorderRadius;
    }

    function buildLines() {
      const maxWidth = Math.max(1, activeShape.lineWidth - resolvedConfig.textInset * 2);
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
      const numSlots = Math.ceil(activeShape.perimeter / resolvedConfig.lineSpacing) + 1;

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
      const placed = layoutShapeLines(
        articleLines,
        activeShape,
        startT,
        resolvedConfig.lineSpacing,
        loop,
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
          element.style.width = `${line.lineWidth ?? activeShape.lineWidth}px`;
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
  ]);

  return (
    <div className={rootClassName} style={style}>
      <div className="radialText__disc" ref={discRef}>
        <div className="radialText__ring radialText__ring--outer" ref={outerRingRef} />
        <div className="radialText__ring radialText__ring--inner" ref={innerRingRef} />
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
  const widthRatio = clampUnit(geometry?.widthRatio ?? DEFAULT_GEOMETRY.widthRatio);
  const heightRatio = clampUnit(geometry?.heightRatio ?? DEFAULT_GEOMETRY.heightRatio);
  const trackThickness = clamp(geometry?.trackThickness ?? DEFAULT_GEOMETRY.trackThickness, 0.05, 0.9);
  const cornerRadius = clamp(geometry?.cornerRadius ?? DEFAULT_GEOMETRY.cornerRadius, 0, 1);
  const fontFamily = typography?.fontFamily ?? DEFAULT_TYPOGRAPHY.fontFamily;
  const bodySize = Math.max(1, typography?.bodySize ?? DEFAULT_TYPOGRAPHY.bodySize);
  const headingSize = Math.max(1, typography?.headingSize ?? DEFAULT_TYPOGRAPHY.headingSize);
  const quoteSize = Math.max(1, typography?.quoteSize ?? DEFAULT_TYPOGRAPHY.quoteSize);
  const bodyWeight = Math.max(1, typography?.bodyWeight ?? DEFAULT_TYPOGRAPHY.bodyWeight);
  const headingWeight = Math.max(1, typography?.headingWeight ?? DEFAULT_TYPOGRAPHY.headingWeight);

  return {
    shapeOptions: {
      scale: 1,
      scaleX: widthRatio,
      scaleY: heightRatio,
      innerRatio: 1 - trackThickness,
      cornerRadius,
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

function clampUnit(value: number) {
  return clamp(value, 0.05, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
