import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArticleLines,
  calculateScrollStartT,
  calculateDiscGeometry,
  createEllipseShape,
  createStadiumShape,
  layoutCircleLines,
  parseArticle,
} from "../src/article-layout.mjs";

test("parseArticle preserves article block structure", () => {
  const blocks = parseArticle(`
What is Lorem Ipsum?
Lorem Ipsum is simply dummy text of the printing industry.

## Why do we use it?
- It has a normal distribution of letters.
- It looks like readable English.

> This is a pull quote.
`);

  assert.deepEqual(blocks, [
    { kind: "heading", text: "What is Lorem Ipsum?", level: 1 },
    { kind: "paragraph", text: "Lorem Ipsum is simply dummy text of the printing industry." },
    { kind: "heading", text: "Why do we use it?", level: 2 },
    { kind: "list-item", text: "It has a normal distribution of letters." },
    { kind: "list-item", text: "It looks like readable English." },
    { kind: "quote", text: "This is a pull quote." },
  ]);
});

test("buildArticleLines wraps blocks without flattening article boundaries", () => {
  const lines = buildArticleLines("Title\nA short paragraph for wrapping.\n\n- First item\n- Second item", {
    maxWidth: 80,
    wrapText: createTestWrapper(),
  });

  assert.equal(lines[0].kind, "heading");
  assert.equal(lines[0].text, "Title");
  assert(lines.some((line) => line.kind === "spacer"));
  assert(lines.some((line) => line.kind === "list-item" && line.text.startsWith("- First")));
  assert(lines.some((line) => line.kind === "list-continuation" || line.kind === "list-item"));
});

test("layoutCircleLines distributes every line around one full circle", () => {
  const lines = Array.from({ length: 4 }, (_, index) => ({
    kind: "paragraph",
    text: `Line ${index + 1}`,
    fontSize: 13,
    weight: 400,
  }));

  const placed = layoutCircleLines(lines, -90);

  assert.deepEqual(
    placed.map((line) => line.angleDeg),
    [-90, 0, 90, 180],
  );
  assert.deepEqual(
    placed.map((line) => line.text),
    ["Line 1", "Line 2", "Line 3", "Line 4"],
  );
});

test("buildArticleLines uses compact radial typography", () => {
  const lines = buildArticleLines("Title\nBody text", {
    maxWidth: 180,
    wrapText: createTestWrapper(),
  });

  assert.equal(lines[0].fontSize, 11);
  assert.equal(lines.find((line) => line.kind === "paragraph")?.fontSize, 9);
});

function createTestWrapper() {
  return (text, maxWidth, style) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = test.length * (style.fontSize * 0.5);

      if (width <= maxWidth || !current) {
        current = test;
        continue;
      }

      lines.push(current);
      current = word;
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  };
}

test("calculateDiscGeometry fits the circle to viewport height", () => {
  assert.deepEqual(calculateDiscGeometry(1440, 900), {
    outerRadius: 446,
    innerRadius: 196,
    lineWidth: 250,
  });

  assert.deepEqual(calculateDiscGeometry(360, 740), {
    outerRadius: 176,
    innerRadius: 77,
    lineWidth: 99,
  });
});

test("createEllipseShape can stretch width and height independently", () => {
  const shape = createEllipseShape(1000, 600, {
    scale: 1,
    scaleX: 1.2,
    scaleY: 0.8,
    innerRatio: 0.5,
  });

  assert.equal(shape.outerWidth, 1192);
  assert.equal(shape.outerHeight, 472);
  assert.equal(shape.innerWidth, 596);
  assert.equal(shape.innerHeight, 236);
});

test("createStadiumShape can stretch width and height independently", () => {
  const shape = createStadiumShape(1000, 600, {
    scale: 1,
    scaleX: 0.8,
    scaleY: 1.2,
    innerRatio: 0.5,
  });

  assert.equal(shape.outerWidth, 792);
  assert.equal(shape.outerHeight, 712);
  assert.equal(shape.innerWidth, 436);
  assert.equal(shape.innerHeight, 356);
});

test("calculateScrollStartT supports reversed scroll direction", () => {
  assert.equal(calculateScrollStartT(250, 1000, 1), 0.25);
  assert.equal(calculateScrollStartT(250, 1000, -1), -0.25);
  assert.equal(calculateScrollStartT(250, 0, -1), -250);
});
