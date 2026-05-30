import {
  getArticleBlocks,
  createEllipseShape,
  createStadiumShape,
  createRectyShape,
  createWaveShape,
  type ParsedArticleBlock,
  type TrackShape,
} from "./article-layout";
import { createPretextWrapper, fillLine } from "./pretext-wrap";


export interface AppShapeOptions {
  scale: number;
  innerRatioX: number;
  innerRatioY: number;
  align: "left" | "justify" | "right";
  linePadding: number;
  lineSpacing: number;
  // stadium / recty
  shapeX: number;
  shapeY: number;
  cornerRadius: number;
  rectyCorner: number;
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
  setShape(kind: "stadium" | "ellipse" | "wave" | "recty"): void;
  setTypography(opts: TypographyOptions): void;
  setGuidesVisible(show: boolean): void;
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

  interface ContentBlock {
    kind: ParsedArticleBlock["kind"] | "separator";
    text: string;
    fontSize: number;
    weight: number;
    italic: boolean;
  }

  let typography: TypographyOptions = { ...DEFAULT_TYPOGRAPHY };
  let articleText = "";
  let contentBlocks: ContentBlock[] = [];
  let totalContentLength = 0;
  let lineElements: HTMLElement[] = [];
  let loopContent = false;
  const shapeFactories = {
    stadium: (w: number, h: number, o: AppShapeOptions) => createStadiumShape(w, h, o),
    ellipse: (w: number, h: number, o: AppShapeOptions) => createEllipseShape(w, h, o),
    wave:    (w: number, h: number, o: AppShapeOptions) => createWaveShape(w, h, o),
    recty:   (w: number, h: number, o: AppShapeOptions) => createRectyShape(w, h, o),
  };
  let activeShapeKind: "stadium" | "ellipse" | "wave" | "recty" = "stadium";
  let shapeOptions: AppShapeOptions = {
    scale: 1, innerRatioX: 0.44, innerRatioY: 0.44, align: "left", linePadding: 6, lineSpacing: 13,
    shapeX: 1, shapeY: 1, cornerRadius: 0.7, rectyCorner: 0.3,
    waveAmplitude: 0.35, waveCycles: 4,
  };
  let shape: TrackShape = createStadiumShape(window.innerWidth, window.innerHeight, shapeOptions);
  let latestScrollY = 0;
  let ticking = false;
  let resizeFrame = 0;
  let guidesVisible = true;
  let guideSvg: SVGSVGElement | null = null;

  function ensureGuidePaths(count: number): SVGPathElement[] {
    if (!guideSvg) {
      guideSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      guideSvg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
      disc.appendChild(guideSvg);
    }
    const w = window.innerWidth, h = window.innerHeight;
    guideSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    guideSvg.style.visibility = guidesVisible ? "" : "hidden";
    const existing = Array.from(guideSvg.querySelectorAll("path")) as SVGPathElement[];
    while (existing.length < count) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path") as SVGPathElement;
      p.setAttribute("fill", "none");
      p.setAttribute("stroke-width", "1");
      guideSvg.appendChild(p);
      existing.push(p);
    }
    existing.forEach((p, i) => { p.style.display = i < count ? "" : "none"; });
    return existing.slice(0, count);
  }

  function applyGeometry() {
    shape = shapeFactories[activeShapeKind](window.innerWidth, window.innerHeight, shapeOptions);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;

    if (shape.outerGuidePath) {
      // Superellipse: both guides as SVG paths, hide CSS rings
      outerRing.style.visibility = "hidden";
      innerRing.style.visibility = "hidden";
      const [outerPath, innerPath] = ensureGuidePaths(2);
      outerPath.setAttribute("d", shape.outerGuidePath(cx, cy));
      outerPath.style.stroke = "var(--ring-color)";
      innerPath.setAttribute("d", shape.innerGuidePath!(cx, cy));
      innerPath.style.stroke = "var(--ring-color)";
    } else if (shape.innerGuidePath) {
      // Wave: outer is CSS ring, inner is SVG path
      outerRing.style.width = shape.outerWidth + "px";
      outerRing.style.height = shape.outerHeight + "px";
      outerRing.style.borderRadius = shape.outerBorderRadius;
      outerRing.style.visibility = guidesVisible ? "" : "hidden";
      innerRing.style.visibility = "hidden";
      const [innerPath] = ensureGuidePaths(1);
      innerPath.setAttribute("d", shape.innerGuidePath(cx, cy));
      innerPath.style.stroke = "var(--ring-color)";
    } else {
      // Pure CSS: ellipse
      if (guideSvg) guideSvg.style.visibility = "hidden";
      outerRing.style.width = shape.outerWidth + "px";
      outerRing.style.height = shape.outerHeight + "px";
      outerRing.style.borderRadius = shape.outerBorderRadius;
      outerRing.style.visibility = guidesVisible ? "" : "hidden";
      innerRing.style.visibility = guidesVisible ? "" : "hidden";
      innerRing.style.width = shape.innerWidth + "px";
      innerRing.style.height = shape.innerHeight + "px";
      innerRing.style.borderRadius = shape.innerBorderRadius;
    }
  }

  function setGuidesVisible(show: boolean) {
    guidesVisible = show;
    if (shape.outerGuidePath) {
      if (guideSvg) guideSvg.style.visibility = show ? "" : "hidden";
    } else if (shape.innerGuidePath) {
      outerRing.style.visibility = show ? "" : "hidden";
      if (guideSvg) guideSvg.style.visibility = show ? "" : "hidden";
    } else {
      outerRing.style.visibility = show ? "" : "hidden";
      innerRing.style.visibility = show ? "" : "hidden";
    }
  }

  function buildLines() {
    const ty = typography;
    const rawBlocks = getArticleBlocks(articleText);
    contentBlocks = rawBlocks.map((b) => ({
      kind: b.kind,
      text: b.text,
      fontSize: b.kind === "heading" ? ty.headingSize : ty.bodySize,
      weight: b.kind === "heading" ? ty.headingWeight : ty.bodyWeight,
      italic: Boolean(b.style.italic),
    }));
    // Separator acts as a visible end-of-content marker; text generated per slot at render time
    contentBlocks.push({ kind: "separator", text: "", fontSize: ty.bodySize, weight: ty.bodyWeight, italic: false });
    totalContentLength = contentBlocks.reduce((s, b) => s + Math.max(1, b.text.length), 0);
  }

  function renderRadial() {
    const numSlots = Math.ceil(shape.perimeter / shapeOptions.lineSpacing) + 1;
    disc.querySelectorAll(".line").forEach((el) => el.remove());
    lineElements = [];

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
    // Estimate line count using average content width so scroll range feels proportional
    const avgContentWidth = Math.max(1, shape.lineWidth - shapeOptions.linePadding * 2);
    const avgCharsPerLine = Math.max(1, Math.round(avgContentWidth / 5));
    const estimatedLines = totalContentLength / avgCharsPerLine;
    const LINES_PER_VIEWPORT = 80;
    const MIN_SCROLL_HEIGHT = 260;
    const height = Math.max(MIN_SCROLL_HEIGHT, Math.ceil(estimatedLines / LINES_PER_VIEWPORT) * 100);
    document.body.style.setProperty("--scroll-height", `${height}vh`);
  }

  function updateConveyorBelt() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const rawT = latestScrollY / maxScroll;
    const startT = loopContent ? ((rawT % 1) + 1) % 1 : Math.max(0, Math.min(rawT, 1));
    const isJustify = shapeOptions.align === "justify";

    // Map scroll position to starting character position in content
    const startChar = startT * totalContentLength;
    let bIdx = 0;
    let bOff = 0;
    let acc = 0;
    for (let b = 0; b < contentBlocks.length; b++) {
      const len = Math.max(1, contentBlocks[b].text.length);
      if (acc + len > startChar) { bIdx = b; bOff = startChar - acc; break; }
      acc += len;
      bIdx = b + 1;
    }

    // Sub-slot fractional offset for smooth scrolling
    const step = shapeOptions.lineSpacing / shape.perimeter;
    const slotsFromStart = startT / step;
    const frac = slotsFromStart - Math.floor(slotsFromStart);

    let curBIdx = bIdx;
    let curBOff = bOff;

    for (let i = 0; i < lineElements.length; i++) {
      const el = lineElements[i];

      // rawT is the normalized angular position; mirrors the layoutShapeLines convention.
      // Negative rawT or rawT >= 1 means the slot is outside the visible arc this frame.
      const rawT = (i - frac) * step;
      if (rawT < 0 || rawT >= 1) {
        el.style.visibility = "hidden";
        continue;
      }
      const t = loopContent ? ((rawT % 1) + 1) % 1 : rawT;

      if (curBIdx >= contentBlocks.length) {
        if (loopContent) { curBIdx = 0; curBOff = 0; }
        else { el.style.visibility = "hidden"; continue; }
      }

      const pt = shape.point(t);
      const slotWidth = pt.lineWidth ?? shape.lineWidth;
      const maxWidth = Math.max(1, slotWidth - shapeOptions.linePadding * 2);

      const block = contentBlocks[curBIdx];
      let lineText: string;

      if (block.kind === "spacer") {
        lineText = "";
        curBIdx++;
        curBOff = 0;
      } else if (block.kind === "separator") {
        lineText = fillLine("=", maxWidth, { fontSize: block.fontSize, weight: block.weight, family: typography.fontFamily });
        curBIdx++;
        curBOff = 0;
      } else {
        const remaining = block.text.slice(Math.max(0, Math.floor(curBOff)));
        const wrapped = wrapText(remaining, maxWidth, { fontSize: block.fontSize, weight: block.weight, family: typography.fontFamily, italic: block.italic });
        lineText = wrapped[0] || "";
        const consumed = lineText.length + 1;
        curBOff += consumed;
        if (Math.floor(curBOff) >= block.text.length) { curBIdx++; curBOff = 0; }
      }

      el.style.visibility = "";
      el.style.transform = lineTransform({ x: pt.x, y: pt.y, angleDeg: pt.angleDeg, fontSize: block.fontSize });
      el.className = `line line--${block.kind}`;
      el.textContent = lineText;
      el.style.width = slotWidth + "px";
      el.style.fontSize = block.fontSize + "px";
      el.style.fontWeight = String(block.weight);
      el.style.fontFamily = typography.fontFamily;
      el.style.fontStyle = block.italic ? "italic" : "normal";
      el.style.paddingLeft = shapeOptions.linePadding + "px";
      el.style.paddingRight = shapeOptions.linePadding + "px";
      el.style.textAlign = isJustify ? "justify" : shapeOptions.align;
      el.style.textAlignLast = isJustify ? "justify" : "";
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
    updateConveyorBelt();
  }

  function setTypography(opts: TypographyOptions) {
    typography = opts;
    rebuild();
  }

  function getDiscEl(): HTMLElement {
    return disc;
  }

  return { start, destroy, loadText, setShape, setOptions, setLoop, setTypography, setGuidesVisible, getDiscEl };
}

function lineTransform(line: { x: number; y: number; angleDeg: number; fontSize: number }): string {
  const pivotAdjY = line.y - line.fontSize / 2;
  return `translate(${line.x}px, ${pivotAdjY}px) rotate(${line.angleDeg}deg)`;
}
