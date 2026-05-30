import {
  getArticleBlocks,
  createDnaHelix,
  type ParsedArticleBlock,
  type TrackShape,
} from "./article-layout";
import { createPretextWrapper, fillLine } from "./pretext-wrap";
import type { AppShapeOptions, TypographyOptions } from "./radial-renderer";

export interface LinearArticleApp {
  start(): void;
  destroy(): void;
  loadText(text: string): void;
  setOptions(opts: Partial<AppShapeOptions>): void;
  setLoop(val: boolean): void;
  setTypography(opts: TypographyOptions): void;
  setGuidesVisible(show: boolean): void;
  getDiscEl(): HTMLElement;
}

export function createLinearArticleApp({
  disc,
  outerRing,
  innerRing,
  status,
  shapeOptions: initialShapeOptions,
  typography: initialTypography,
}: {
  disc: HTMLElement;
  outerRing: HTMLElement;
  innerRing: HTMLElement;
  status: HTMLElement;
  shapeOptions: AppShapeOptions;
  typography: TypographyOptions;
}): LinearArticleApp {
  const wrapText = createPretextWrapper();

  interface ContentBlock {
    kind: ParsedArticleBlock["kind"] | "separator";
    text: string;
    fontSize: number;
    weight: number;
    italic: boolean;
  }

  let typography = { ...initialTypography };
  let shapeOptions = { ...initialShapeOptions };
  let articleText = "";
  let contentBlocks: ContentBlock[] = [];
  let totalContentLength = 0;
  let lineElements: HTMLElement[] = [];
  let loopContent = false;
  let shape: TrackShape = createDnaHelix(window.innerWidth, window.innerHeight, shapeOptions);
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
    shape = createDnaHelix(window.innerWidth, window.innerHeight, shapeOptions);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;

    if (shape.outerGuidePath && shape.innerGuidePath) {
      outerRing.style.visibility = "hidden";
      innerRing.style.visibility = "hidden";
      const [outerPath, innerPath] = ensureGuidePaths(2);
      outerPath.setAttribute("d", shape.outerGuidePath(cx, cy));
      outerPath.style.stroke = "var(--ring-color)";
      innerPath.setAttribute("d", shape.innerGuidePath(cx, cy));
      innerPath.style.stroke = "var(--ring-color)";
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
    contentBlocks.push({ kind: "separator", text: "", fontSize: ty.bodySize, weight: ty.bodyWeight, italic: false });
    totalContentLength = contentBlocks.reduce((s, b) => s + Math.max(1, b.text.length), 0);
  }

  function renderLinear() {
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

    const step = shapeOptions.lineSpacing / shape.perimeter;
    const slotsFromStart = startT / step;
    const frac = slotsFromStart - Math.floor(slotsFromStart);

    let curBIdx = bIdx;
    let curBOff = bOff;

    for (let i = 0; i < lineElements.length; i++) {
      const el = lineElements[i];
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
      el.style.transform = `translate(${pt.x + window.innerWidth / 2}px, ${pt.y + window.innerHeight / 2}px) rotate(${pt.angleDeg}deg)`;
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
      el.style.whiteSpace = "nowrap";
      el.style.overflow = "hidden";
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
    if (!articleText) return;
    applyGeometry();
    buildLines();
    setScrollHeight();
    renderLinear();
  }

  function requestRebuild() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(rebuild);
  }

  function setGuidesVisible(show: boolean) {
    guidesVisible = show;
    if (guideSvg) guideSvg.style.visibility = show ? "" : "hidden";
  }

  return {
    start() {
      rebuild();
      window.addEventListener("scroll", requestConveyorUpdate, { passive: true });
      window.addEventListener("resize", requestRebuild);
    },
    destroy() {
      window.removeEventListener("scroll", requestConveyorUpdate);
      window.removeEventListener("resize", requestRebuild);
      cancelAnimationFrame(resizeFrame);
    },
    loadText(text: string) {
      articleText = text;
      rebuild();
    },
    setOptions(opts: Partial<AppShapeOptions>) {
      Object.assign(shapeOptions, opts);
      rebuild();
    },
    setLoop(val: boolean) {
      loopContent = val;
      requestConveyorUpdate();
    },
    setTypography(opts: TypographyOptions) {
      Object.assign(typography, opts);
      rebuild();
    },
    setGuidesVisible,
    getDiscEl() {
      return disc;
    },
  };
}
