import html2canvas from "html2canvas";

export async function exportDiscAsPng(discEl: HTMLElement, filename = "radial-text.png"): Promise<void> {
  const bgColor = window.getComputedStyle(document.body).backgroundColor;
  const prevBg = discEl.style.background;
  discEl.style.background = bgColor;

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
    discEl.style.background = prevBg;
  }
}
