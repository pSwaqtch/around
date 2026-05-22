import type { ArticleBlock, ArticleLine, ArticleLineKind, ArticleTypography, BuildArticleLinesOptions, TextStyle } from "./types.js";
import { parseArticle } from "./parse.js";
import { fillLine } from "./wrap.js";

export const DEFAULT_BODY_STYLE = Object.freeze({
  fontSize: 9,
  weight: 400,
  family: "Georgia, serif",
});

const STYLE_BY_KIND = Object.freeze({
  heading: Object.freeze({ fontSize: 11, weight: 700, family: "Georgia, serif" }),
  paragraph: DEFAULT_BODY_STYLE,
  "list-item": DEFAULT_BODY_STYLE,
  "list-continuation": DEFAULT_BODY_STYLE,
  quote: Object.freeze({ fontSize: 9, weight: 400, family: "Georgia, serif", italic: true }),
  spacer: DEFAULT_BODY_STYLE,
  separator: DEFAULT_BODY_STYLE,
});

export function buildArticleLines(source: string, options: BuildArticleLinesOptions): ArticleLine[] {
  const maxWidth = options.maxWidth;
  const wrapText = options.wrapText;
  const typography = options.typography;
  const blocks = parseArticle(source);
  const lines: ArticleLine[] = [];

  blocks.forEach((block, index) => {
    const previous = blocks[index - 1];

    if (index > 0 && previous && shouldInsertSpacer(previous, block)) {
      lines.push(createSpacerLine(typography));
    }

    const style = getStyle(block.kind, typography);
    const prefix = block.kind === "list-item" ? "- " : block.kind === "quote" ? '"' : "";
    const suffix = block.kind === "quote" ? '"' : "";
    const wrapped = wrapText(`${prefix}${block.text}${suffix}`, maxWidth, style);

    wrapped.forEach((text, lineIndex) => {
      lines.push({
        kind: lineIndex > 0 && block.kind === "list-item" ? "list-continuation" : block.kind,
        text: lineIndex > 0 && block.kind === "list-item" ? `  ${text}` : text,
        fontSize: style.fontSize,
        weight: style.weight,
        family: style.family,
        italic: Boolean(style.italic),
      });
    });
  });

  return lines;
}

export function calculateScrollStartT(scrollY: number, maxScroll: number, direction = 1): number {
  if (maxScroll <= 0) {
    return scrollY * direction;
  }

  return (scrollY / maxScroll) * direction;
}

export function getStyle(kind: ArticleLineKind, typography?: ArticleTypography): TextStyle {
  const baseStyle = STYLE_BY_KIND[kind] ?? DEFAULT_BODY_STYLE;
  const bodyOverride = typography?.paragraph ?? {};
  const kindOverride = typography?.[kind] ?? {};

  return {
    ...baseStyle,
    ...bodyOverride,
    ...kindOverride,
  };
}

function shouldInsertSpacer(previous: ArticleBlock, current: ArticleBlock) {
  if (current.kind === "list-item" && previous.kind === "list-item") {
    return false;
  }

  return true;
}

function createSpacerLine(typography?: ArticleTypography): ArticleLine {
  const style = getStyle("spacer", typography);

  return {
    kind: "spacer",
    text: "",
    fontSize: 7,
    weight: style.weight,
    family: style.family,
    italic: false,
  };
}

export { fillLine };
