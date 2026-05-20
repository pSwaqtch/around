import {
  buildArticleLines,
  createEllipseShape,
  createStadiumShape,
  layoutShapeLines,
} from "./article-layout.mjs";
import { createPretextWrapper, fillLine } from "./pretext-wrap.mjs";

const MIN_SCROLL_HEIGHT = 260;
const LINES_PER_VIEWPORT = 80;
const MIN_LINE_SPACING = 12; // px between line origins on the inner ring (≥ max font size)

export function createRadialArticleApp({ disc, outerRing, innerRing, status, articleUrl }) {
  const wrapText = createPretextWrapper();

  let articleText = "";
  let articleLines = [];
  let lineElements = [];
  let prevLineIndices = [];
  let loopContent = false;
  const shapeFactories = {
    stadium: createStadiumShape,
    ellipse: createEllipseShape,
  };
  let activeShapeKind = "stadium";
  let shapeOptions = { scale: 1, innerRatio: 0.44, align: "left", linePadding: 6, shapeX: 0.3, shapeY: 0, cornerRadius: 1 };
  let shape = createStadiumShape(window.innerWidth, window.innerHeight, shapeOptions);
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
    const maxWidth = shape.lineWidth - shapeOptions.linePadding * 2;
    articleLines = buildArticleLines(articleText, { maxWidth, wrapText });

    const sepStyle = { fontSize: 9, weight: 400, family: "Georgia, serif" };
    const sepText = fillLine("=", maxWidth, sepStyle);
    articleLines.push({ kind: "separator", text: sepText, fontSize: 9, weight: 400, italic: false });
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

      // Only re-paint content when the article line at this slot changes
      if (line._lineIndex !== prevLineIndices[i]) {
        el.className = `line line--${line.kind}`;
        el.textContent = line.text;
        el.style.width = (line.lineWidth ?? shape.lineWidth) + "px";
        el.style.fontSize = line.fontSize + "px";
        el.style.fontWeight = String(line.weight);
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

  async function loadArticle() {
    try {
      applyGeometry();

      const res = await fetch(articleUrl);

      if (!res.ok) {
        throw new Error(`Unable to load article: ${res.status}`);
      }

      articleText = await res.text();
      rebuild();
      status.hidden = true;
    } catch (error) {
      status.hidden = false;
      status.textContent = error instanceof Error ? error.message : "Unable to load article.";
    }
  }

  function start() {
    window.addEventListener("scroll", requestConveyorUpdate, { passive: true });
    window.addEventListener("resize", requestRebuild);
    window.addEventListener("keydown", handleKeydown);

    loadArticle();
  }

  function handleKeydown(event) {
    if (event.key === "ArrowLeft") {
      window.scrollBy({ top: -window.innerHeight * 0.25, behavior: "smooth" });
    }

    if (event.key === "ArrowRight") {
      window.scrollBy({ top: window.innerHeight * 0.25, behavior: "smooth" });
    }
  }

  function setShape(kind) {
    if (!shapeFactories[kind] || kind === activeShapeKind) return;
    activeShapeKind = kind;
    rebuild();
  }

  function setOptions(opts) {
    Object.assign(shapeOptions, opts);
    rebuild();
  }

  function setLoop(val) {
    loopContent = val;
    prevLineIndices = [];
    updateConveyorBelt();
  }

  return { start, setShape, setOptions, setLoop };
}

// transform-origin: left center puts the CSS pivot at (0, fontSize/2) in element
// space, which is fontSize/2 below the inner-ring point.  Subtracting fontSize/2
// from the y translate moves the pivot onto the ring so the outward gap is
// uniformly `padding-left` at every angle instead of varying with sin(θ).
function lineTransform(line) {
  const pivotAdjY = line.y - line.fontSize / 2;
  return `translate(${line.x}px, ${pivotAdjY}px) rotate(${line.angleDeg}deg)`;
}
