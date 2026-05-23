export function exportDiscAsSvg(discEl: HTMLElement, filename = "radial-text.svg"): void {
  const w = discEl.offsetWidth;
  const h = discEl.offsetHeight;
  const cx = w / 2;
  const cy = h / 2;
  const bgColor =
    window.getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#f2f2f2";

  const textEls: string[] = [];

  discEl.querySelectorAll<HTMLElement>(".line").forEach((el) => {
    if (el.style.visibility === "hidden" || !el.textContent) return;

    const { tx, ty, rot } = parseTransform(el.style.transform);
    const fontSize = parseFloat(el.style.fontSize) || 9;
    const ax = (cx + tx).toFixed(2);
    const ay = (cy + ty + fontSize / 2).toFixed(2);
    const fill = window.getComputedStyle(el).color;
    const px = parseFloat(el.style.paddingLeft) || 0;
    const fontFamily = el.style.fontFamily || "Georgia, serif";

    textEls.push(
      `<g transform="translate(${ax},${ay}) rotate(${rot.toFixed(2)})">` +
        `<text x="${px}" dominant-baseline="middle"` +
        ` font-size="${fontSize}" font-family="${esc(fontFamily)}"` +
        ` font-weight="${el.style.fontWeight}" font-style="${el.style.fontStyle || "normal"}"` +
        ` fill="${fill}">${esc(el.textContent)}</text></g>`,
    );
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n` +
    `<rect width="${w}" height="${h}" fill="${esc(bgColor)}"/>\n` +
    textEls.join("\n") +
    `\n</svg>`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.download = filename;
  a.click();
  a.remove();
}

function parseTransform(t: string): { tx: number; ty: number; rot: number } {
  const tr = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
  const ro = t.match(/rotate\(([^)]+)deg\)/);
  return {
    tx: tr ? parseFloat(tr[1]) : 0,
    ty: tr ? parseFloat(tr[2]) : 0,
    rot: ro ? parseFloat(ro[1]) : 0,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
