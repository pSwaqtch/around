import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

const LINE_HEIGHT_RATIO = 1.12;

export function createPretextWrapper() {
  const preparedCache = new Map();

  return function wrapText(text, maxWidth, style) {
    const font = toCanvasFont(style);
    const key = `${font}\n${text}`;
    let prepared = preparedCache.get(key);

    if (!prepared) {
      prepared = prepareWithSegments(text, font);
      preparedCache.set(key, prepared);
    }

    return layoutWithLines(prepared, maxWidth, style.fontSize * LINE_HEIGHT_RATIO)
      .lines
      .map((line) => line.text);
  };
}

function toCanvasFont(style) {
  const fontStyle = style.italic ? "italic " : "";

  return `${fontStyle}${style.weight} ${style.fontSize}px ${style.family}`;
}
