import {
  buildArticleLines,
  createEllipseShape,
  createStadiumShape,
  createWaveShape,
  layoutShapeLines,
  type ArticleLine,
  type TrackShape,
} from "./article-layout";
import { createPretextWrapper, fillLine } from "./pretext-wrap";

const MIN_LINE_SPACING = 12;

export interface AppShapeOptions {
  scale: number;
  innerRatio: number;
  align: "left" | "justify" | "right";
  linePadding: number;
  // stadium
  shapeX: number;
  shapeY: number;
  cornerRadius: number;
  // wave
  waveAmplitude: number;
  waveCycles: number;
}

export interface TypographyOptions {
  fontFamily: string;
  bodySize: number;
  headingSize: number;
  bodyWeight: number;
  headingWeight: number;
}

export const DEFAULT_TYPOGRAPHY: TypographyOptions = {
  fontFamily: "Georgia, serif",
  bodySize: 9,
  headingSize: 11,
  bodyWeight: 400,
  headingWeight: 700,
};

export interface RadialArticleApp {
  start(): void;
  destroy(): void;
  loadText(text: string): void;
  setShape(kind: "stadium" | "ellipse"): void;
  setOptions(opts: Partial<AppShapeOptions>): void;
  setLoop(val: boolean): void;
  setShape(kind: "stadium" | "ellipse" | "wave"): void;
  setTypography(opts: TypographyOptions): void;
  getDiscEl(): HTMLElement;
}

export function createRadialArticleApp({
  disc,
  outerRing,
  innerRing,
  status,
}: {
  disc: HTMLElement;
  outerRing: HTMLElement;
  innerRing: HTMLElement;
  status: HTMLElement;
}): RadialArticleApp {
  const wrapText = createPretextWrapper();

  let typography: TypographyOptions = { ...DEFAULT_TYPOGRAPHY };
  let articleText = "";
  let articleLines: ArticleLine[] = [];
  let lineElements: HTMLElement[] = [];
  let prevLineIndices: number[] = [];
  let loopContent = false;
  const shapeFactories = {
    stadium: (w: number, h: number, o: AppShapeOptions) => createStadiumShape(w, h, o),
    ellipse: (w: number, h: number, o: AppShapeOptions) => createEllipseShape(w, h, o),
    wave:    (w: number, h: number, o: AppShapeOptions) => createWaveShape(w, h, o),
  };
  let activeShapeKind: "stadium" | "ellipse" | "wave" = "stadium";
  let shapeOptions: AppShapeOptions = {
    scale: 1, innerRatio: 0.44, align: "left", linePadding: 6,
    shapeX: 0.3, shapeY: 0, cornerRadius: 1,
    waveAmplitude: 0.35, waveCycles: 4,
  };
  let shape: TrackShape = createStadiumShape(window.innerWidth, window.innerHeight, shapeOptions);
  let latestScrollY = 0;
  let ticking = false;
  let resizeFrame = 0;

  function applyGeometry() {
    shape = shapeFactories[activeShapeKind](window.innerWidth, window.innerHeight, shapeOptions);

    outerRing.style.width = shape.outerWidth + "px";
    outerRing.style.height = shape.outerHeight + "px";
    outerRing.style.borderRadius = shape.outerBorderRadius;

    innerRing.style.width = shape.innerWidth + "px";
    innerRing.style.height = shape.innerHeight + "px";
    innerRing.style.borderRadius = shape.innerBorderRadius;
  }

  function buildLines() {
    const ty = typography;
    const maxWidth = Math.max(1, shape.lineWidth - shapeOptions.linePadding * 2);

    const customWrap = (text: string, mw: number, style: import("./article-layout").LineStyle) =>
      wrapText(text, mw, { ...style, family: ty.fontFamily });

    articleLines = buildArticleLines(articleText, { maxWidth, wrapText: customWrap });

    articleLines = articleLines.map((line) => ({
      ...line,
      fontSize: line.kind === "heading" ? ty.headingSize : ty.bodySize,
      weight: line.kind === "heading" ? ty.headingWeight : ty.bodyWeight,
    }));

    const sepStyle = { fontSize: ty.bodySize, weight: ty.bodyWeight, family: ty.fontFamily };
    const sepText = fillLine("=", maxWidth, sepStyle);
    articleLines.push({ kind: "separator", text: sepText, fontSize: ty.bodySize, weight: ty.bodyWeight, italic: false });
  }

  function renderRadial() {
    const numSlots = Math.ceil(shape.perimeter / MIN_LINE_SPACING) + 1;
    disc.querySelectorAll(".line").forEach((el) => el.remove());
    lineElements = [];
    prevLineIndices = [];

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < numSlots; i++) {
      const div = document.createElement("div");
      div.className = "line";
      div.style.visibility = "hidden";
      lineElements.push(div);
      fragment.appendChild(div);
    }
    disc.appendChild(fragment);

    updateConveyorBelt();
  }

  function setScrollHeight() {
    const LINES_PER_VIEWPORT = 80;
    const MIN_SCROLL_HEIGHT = 260;
    const height = Math.max(
      MIN_SCROLL_HEIGHT,
      Math.ceil(articleLines.length / LINES_PER_VIEWPORT) * 100,
    );
    document.body.style.setProperty("--scroll-height", `${height}vh`);
  }

  function updateConveyorBelt() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const startT = latestScrollY / maxScroll;
    const placed = layoutShapeLines(articleLines, shape, startT, MIN_LINE_SPACING, loopContent);
    const isJustify = shapeOptions.align === "justify";

    for (let i = 0; i < lineElements.length; i++) {
      const el = lineElements[i];
      const line = placed[i];

      if (!line) {
        el.style.visibility = "hidden";
        continue;
      }

      el.style.visibility = "";
      el.style.transform = lineTransform(line);

      if (line._lineIndex !== prevLineIndices[i]) {
        el.className = `line line--${line.kind}`;
        el.textContent = line.text;
        el.style.width = (line.lineWidth ?? shape.lineWidth) + "px";
        el.style.fontSize = line.fontSize + "px";
        el.style.fontWeight = String(line.weight);
        el.style.fontFamily = typography.fontFamily;
        el.style.fontStyle = line.italic ? "italic" : "normal";
        el.style.paddingLeft = shapeOptions.linePadding + "px";
        el.style.paddingRight = shapeOptions.linePadding + "px";
        el.style.textAlign = isJustify ? "justify" : shapeOptions.align;
        el.style.textAlignLast = isJustify ? "justify" : "";
        prevLineIndices[i] = line._lineIndex;
      }
    }

    ticking = false;
  }

  function requestConveyorUpdate() {
    latestScrollY = window.scrollY;

    if (!ticking) {
      requestAnimationFrame(updateConveyorBelt);
      ticking = true;
    }
  }

  function rebuild() {
    if (!articleText) {
      return;
    }

    applyGeometry();
    buildLines();
    setScrollHeight();
    renderRadial();
  }

  function requestRebuild() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(rebuild);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      window.scrollBy({ top: -window.innerHeight * 0.25, behavior: "smooth" });
    }

    if (event.key === "ArrowRight") {
      window.scrollBy({ top: window.innerHeight * 0.25, behavior: "smooth" });
    }
  }

  function start() {
    window.addEventListener("scroll", requestConveyorUpdate, { passive: true });
    window.addEventListener("resize", requestRebuild);
    window.addEventListener("keydown", handleKeydown);
  }

  function destroy() {
    window.removeEventListener("scroll", requestConveyorUpdate);
    window.removeEventListener("resize", requestRebuild);
    window.removeEventListener("keydown", handleKeydown);
    cancelAnimationFrame(resizeFrame);
  }

  function loadText(text: string) {
    articleText = text;
    if (text) {
      rebuild();
      status.hidden = true;
    }
  }

  function setShape(kind: "stadium" | "ellipse" | "wave") {
    if (!shapeFactories[kind] || kind === activeShapeKind) return;
    activeShapeKind = kind;
    rebuild();
  }

  function setOptions(opts: Partial<AppShapeOptions>) {
    Object.assign(shapeOptions, opts);
    rebuild();
  }

  function setLoop(val: boolean) {
    loopContent = val;
    prevLineIndices = [];
    updateConveyorBelt();
  }

  function setTypography(opts: TypographyOptions) {
    typography = opts;
    rebuild();
  }

  function getDiscEl(): HTMLElement {
    return disc;
  }

  return { start, destroy, loadText, setShape, setOptions, setLoop, setTypography, getDiscEl };
}

function lineTransform(line: { x: number; y: number; angleDeg: number; fontSize: number }): string {
  const pivotAdjY = line.y - line.fontSize / 2;
  return `translate(${line.x}px, ${pivotAdjY}px) rotate(${line.angleDeg}deg)`;
}
