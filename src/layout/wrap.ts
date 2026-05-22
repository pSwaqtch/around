import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

import type { TextStyle } from "./types.js";

const LINE_HEIGHT_RATIO = 1.12;

let measureContext: CanvasRenderingContext2D | null | undefined;

export function measureTextWidth(text: string, style: TextStyle) {
  const context = getMeasureContext();

  if (!context) {
    return text.length * style.fontSize * 0.55;
  }

  context.font = toCanvasFont(style);
  return context.measureText(text).width;
}

export function fillLine(char: string, maxWidth: number, style: TextStyle) {
  const charWidth = measureTextWidth(char, style);
  const repeatCount = charWidth > 0 ? Math.floor(maxWidth / charWidth) : 1;

  return char.repeat(Math.max(1, repeatCount));
}

export function createPretextWrapper() {
  const preparedCache = new Map<string, unknown>();

  return function wrapText(text: string, maxWidth: number, style: TextStyle) {
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

function getMeasureContext() {
  if (measureContext !== undefined) {
    return measureContext;
  }

  if (typeof document === "undefined") {
    measureContext = null;
    return measureContext;
  }

  const canvas = document.createElement("canvas");
  measureContext = canvas.getContext("2d");

  return measureContext;
}

function toCanvasFont(style: TextStyle) {
  const fontStyle = style.italic ? "italic " : "";

  return `${fontStyle}${style.weight} ${style.fontSize}px ${style.family}`;
}
