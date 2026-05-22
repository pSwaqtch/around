import { useMemo, useRef, useState } from "react";

import sampleArticle from "../sample big.txt?raw";
import {
  RadialText,
  type RadialShapeKind,
  type RadialTextGeometry,
  type RadialTextHandle,
  type RadialTextLayout,
  type RadialTextTypography,
} from "./components/RadialText/RadialText.js";
import {
  createRadialGeometry,
  createRadialLayout,
  createRadialTypography,
  FONT_PRESETS,
  getDemoSliders,
  INITIAL_DEMO_OPTIONS_BY_SHAPE,
  SHAPE_OPTIONS,
  type DemoOptions,
  type FontPreset,
} from "./demo/radial-demo-options.js";
import { exportDiscAsPng } from "./lib/export-disc.js";
import { exportDiscAsSvg } from "./lib/export-disc-svg.js";
import type { RadialTextAlign } from "./lib/article-layout.js";

const ALIGNMENTS: RadialTextAlign[] = ["left", "justify", "right"];

export function App() {
  const radialTextRef = useRef<RadialTextHandle>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [shape, setShape] = useState<RadialShapeKind>("stadium");
  const [loop, setLoop] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [align, setAlign] = useState<RadialTextAlign>("left");
  const [fontPreset, setFontPreset] = useState<FontPreset>("serif");
  const [darkMode, setDarkMode] = useState(false);
  const [demoOptionsByShape, setDemoOptionsByShape] = useState(INITIAL_DEMO_OPTIONS_BY_SHAPE);
  const demoOptions = demoOptionsByShape[shape];
  const sliders = useMemo(() => getDemoSliders(shape), [shape]);
  const radialGeometry = useMemo<RadialTextGeometry>(
    () => createRadialGeometry(shape, demoOptions),
    [demoOptions, shape],
  );
  const radialLayout = useMemo<RadialTextLayout>(
    () => createRadialLayout(demoOptions, align),
    [align, demoOptions],
  );
  const radialTypography = useMemo<RadialTextTypography>(
    () => createRadialTypography(fontPreset),
    [fontPreset],
  );

  function updateSlider(id: keyof DemoOptions, value: number) {
    setDemoOptionsByShape((current) => ({
      ...current,
      [shape]: {
        ...current[shape],
        [id]: value,
      },
    }));
  }

  async function handleExportPng() {
    if (isExporting || !radialTextRef.current) return;
    setIsExporting(true);
    try {
      const { discEl, rootEl } = radialTextRef.current;
      await exportDiscAsPng(discEl, rootEl, `radial-text-${shape}.png`);
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportSvg() {
    if (!radialTextRef.current) return;
    exportDiscAsSvg(radialTextRef.current.discEl, `radial-text-${shape}.svg`);
  }

  return (
    <>
      <RadialText
        ref={radialTextRef}
        text={sampleArticle}
        shape={shape}
        loop={loop}
        geometry={radialGeometry}
        layout={radialLayout}
        typography={radialTypography}
        showGuides={showGuides}
        discBg={darkMode ? "#1c1c1e" : undefined}
        textColor={darkMode ? "#e5e5ea" : undefined}
      />

      <aside className="controlDock" aria-label="Radial text controls">
        <button
          className="dockToggle"
          type="button"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen((isOpen) => !isOpen)}
        >
          menu
        </button>

        {controlsOpen ? (
          <div className="controlPanel">
            <div className="controlRow">
              <span className="controlLabel">shape</span>
              <div className="segmentedControl shapeControl">
                {SHAPE_OPTIONS.map((item) => (
                  <button
                    className={item.id === shape ? "segmentButton isActive" : "segmentButton"}
                    key={item.id}
                    type="button"
                    onClick={() => setShape(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="switchRow">
              <button
                className={loop ? "toggleButton isActive" : "toggleButton"}
                type="button"
                aria-pressed={loop}
                onClick={() => setLoop((isLooping) => !isLooping)}
              >
                {loop ? "loop" : "once"}
              </button>
              <button
                className={showGuides ? "toggleButton isActive" : "toggleButton"}
                type="button"
                aria-pressed={showGuides}
                onClick={() => setShowGuides((isVisible) => !isVisible)}
              >
                guides
              </button>
            </div>

            <div className="switchRow">
              <button
                className={darkMode ? "toggleButton isActive" : "toggleButton"}
                type="button"
                aria-pressed={darkMode}
                onClick={() => setDarkMode((d) => !d)}
              >
                dark
              </button>
              <button
                className="toggleButton"
                type="button"
                disabled={isExporting}
                onClick={handleExportPng}
              >
                {isExporting ? "exporting…" : "png"}
              </button>
              <button
                className="toggleButton"
                type="button"
                onClick={handleExportSvg}
              >
                svg
              </button>
            </div>

            <div className="controlRow">
              <span className="controlLabel">font</span>
              <div className="segmentedControl">
                {FONT_PRESETS.map((preset) => (
                  <button
                    className={preset.id === fontPreset ? "segmentButton isActive" : "segmentButton"}
                    key={preset.id}
                    type="button"
                    onClick={() => setFontPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

{sliders.map((slider) => (
              <label className="sliderRow" key={slider.id}>
                <span>{slider.label}</span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={demoOptions[slider.id]}
                  onChange={(event) => updateSlider(slider.id, Number(event.currentTarget.value))}
                />
                <output>{slider.display(demoOptions[slider.id])}</output>
              </label>
            ))}

            <div className="controlRow">
              <span className="controlLabel">align</span>
              <div className="segmentedControl">
                {ALIGNMENTS.map((item) => (
                  <button
                    className={item === align ? "segmentButton isActive" : "segmentButton"}
                    key={item}
                    type="button"
                    onClick={() => setAlign(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
