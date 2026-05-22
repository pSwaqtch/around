# @pswaqtch/around

Radial text layout engine for React. Wraps article-formatted text around closed and open track shapes — stadium, ellipse, spiral, wave, blob, or a custom SVG path.

## Install

```bash
npm install @pswaqtch/around
```

## Usage

```tsx
import { RadialText } from "@pswaqtch/around";
import "@pswaqtch/around/style.css";

function App() {
  return (
    <RadialText
      text={articleText}
      shape="stadium"
      loop
    />
  );
}
```

The component renders a fixed, full-viewport disc. Scrolling advances the text along the track.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | — | Markdown-lite article text (headings `#`, quotes `>`, lists `-`) |
| `shape` | `RadialShapeKind` | `"stadium"` | Track shape |
| `loop` | `boolean` | `false` | Loop text continuously around closed tracks |
| `geometry` | `RadialTextGeometry` | — | Shape dimensions (width/height ratios, corner radius, etc.) |
| `layout` | `RadialTextLayout` | — | Text inset, line spacing, alignment |
| `typography` | `RadialTextTypography` | — | Font family, sizes, weights |
| `discBg` | `string` | — | CSS `background` for the disc (overrides default gradient) |
| `textColor` | `string` | `#171717` | Base text color |
| `showGuides` | `boolean` | `true` | Show inner/outer track boundary guides |
| `ref` | `Ref<RadialTextHandle>` | — | Imperative handle for export |

### `RadialShapeKind`

`"stadium" | "ellipse" | "spiral" | "wave" | "blob" | "svg-path"`

### `RadialTextHandle`

```ts
interface RadialTextHandle {
  discEl: HTMLDivElement;  // the viewport-filling disc element
  rootEl: HTMLDivElement;  // the component root
}
```

## Export

```ts
import { exportDiscAsPng, exportDiscAsSvg } from "@pswaqtch/around";

const { discEl, rootEl } = radialRef.current;
await exportDiscAsPng(discEl, rootEl, "output.png");
exportDiscAsSvg(discEl, "output.svg");
```

`exportDiscAsSvg` walks the live DOM and emits pixel-perfect `<text>` elements — no canvas rendering.

## Text format

The `text` prop accepts a lightweight markdown-like format:

```
# Heading

Regular paragraph text that wraps automatically.

> A blockquote line

- A list item
```

## License

MIT
