import { createRadialArticleApp } from "./radial-renderer.mjs";

const app = createRadialArticleApp({
  disc: document.getElementById("disc"),
  outerRing: document.getElementById("outerRing"),
  innerRing: document.getElementById("innerRing"),
  status: document.getElementById("status"),
  articleUrl: "sample big.txt",
});

app.start();

document.getElementById("hamburger").addEventListener("click", () => {
  const panel = document.getElementById("controls-panel");
  panel.hidden = !panel.hidden;
});

document.getElementById("loopToggle").addEventListener("click", (e) => {
  const next = e.target.dataset.loop !== "true";
  e.target.dataset.loop = String(next);
  e.target.textContent = next ? "once" : "loop";
  app.setLoop(next);
});

const toggle = document.getElementById("shapeToggle");
const shapes = ["stadium", "ellipse"];

toggle.addEventListener("click", () => {
  const next = shapes.find((s) => s !== toggle.dataset.shape);
  toggle.dataset.shape = next;
  toggle.textContent = shapes.find((s) => s !== next);
  app.setShape(next);
});

document.getElementById("sizeSlider").addEventListener("input", (e) => {
  document.getElementById("sizeVal").textContent = e.target.value;
  app.setOptions({ scale: e.target.value / 100 });
});

document.getElementById("trackSlider").addEventListener("input", (e) => {
  document.getElementById("trackVal").textContent = e.target.value;
  app.setOptions({ innerRatio: e.target.value / 100 });
});

document.getElementById("paddingSlider").addEventListener("input", (e) => {
  document.getElementById("paddingVal").textContent = e.target.value;
  app.setOptions({ linePadding: Number(e.target.value) });
});

document.getElementById("shapeXSlider").addEventListener("input", (e) => {
  document.getElementById("shapeXVal").textContent = e.target.value;
  app.setOptions({ shapeX: e.target.value / 100 });
});

document.getElementById("shapeYSlider").addEventListener("input", (e) => {
  document.getElementById("shapeYVal").textContent = e.target.value;
  app.setOptions({ shapeY: e.target.value / 100 });
});

document.getElementById("cornerSlider").addEventListener("input", (e) => {
  document.getElementById("cornerVal").textContent = e.target.value;
  app.setOptions({ cornerRadius: e.target.value / 100 });
});

document.querySelectorAll("input[name='align']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    app.setOptions({ align: e.target.value });
  });
});
