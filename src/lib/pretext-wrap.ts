import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import type { LineStyle } from "./article-layout";

const LINE_HEIGHT_RATIO = 1.12;

const _canvas = document.createElement("canvas");
const _ctx = _canvas.getContext("2d")!;

export function measureTextWidth(text: string, style: LineStyle): number {
  _ctx.font = toCanvasFont(style);
  return _ctx.measureText(text).width;
}

export function fillLine(char: string, maxWidth: number, style: LineStyle): string {
  const charWidth = measureTextWidth(char, style);
  return char.repeat(Math.max(1, Math.floor(maxWidth / charWidth)));
}

export function createPretextWrapper(): (text: string, maxWidth: number, style: LineStyle) => string[] {
  const preparedCache = new Map<string, ReturnType<typeof prepareWithSegments>>();

  return function wrapText(text: string, maxWidth: number, style: LineStyle): string[] {
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

function toCanvasFont(style: LineStyle): string {
  const fontStyle = style.italic ? "italic " : "";
  return `${fontStyle}${style.weight} ${style.fontSize}px ${style.family}`;
}
