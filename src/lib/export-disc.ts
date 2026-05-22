import html2canvas from "html2canvas";

const GUIDES_ACTIVE_CLASS = "radialText--guides";

export async function exportDiscAsPng(
  discEl: HTMLElement,
  rootEl: HTMLElement,
  filename = "radial-text.png",
): Promise<void> {
  const hadGuides = rootEl.classList.contains(GUIDES_ACTIVE_CLASS);

  if (hadGuides) {
    rootEl.classList.remove(GUIDES_ACTIVE_CLASS);
  }

  try {
    const canvas = await html2canvas(discEl, {
      useCORS: true,
      scale: window.devicePixelRatio ?? 1,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      width: discEl.offsetWidth,
      height: discEl.offsetHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
      logging: false,
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
    a.remove();
  } finally {
    if (hadGuides) {
      rootEl.classList.add(GUIDES_ACTIVE_CLASS);
    }
  }
}
