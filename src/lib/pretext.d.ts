declare module "@chenglou/pretext" {
  export function prepareWithSegments(text: string, font: string): unknown;

  export function layoutWithLines(
    prepared: unknown,
    maxWidth: number,
    lineHeight: number,
  ): { lines: Array<{ text: string }> };
}
