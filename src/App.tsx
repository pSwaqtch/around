import { useMemo, useState } from "react";

import sampleArticle from "../sample big.txt?raw";
import {
  RadialText,
  type RadialShapeKind,
  type RadialTextGeometry,
  type RadialTextLayout,
  type RadialTextTypography,
} from "./components/RadialText/RadialText.js";
import {
  createRadialGeometry,
  createRadialLayout,
  createRadialTypography,
  DEMO_SLIDERS,
  FONT_PRESETS,
  INITIAL_DEMO_OPTIONS,
  type DemoOptions,
  type FontPreset,
} from "./demo/radial-demo-options.js";
import type { RadialTextAlign } from "./lib/article-layout.js";

const ALIGNMENTS: RadialTextAlign[] = ["left", "justify", "right"];

export function App() {
  const [controlsOpen, setControlsOpen] = useState(true);
  const [shape, setShape] = useState<RadialShapeKind>("stadium");
  const [loop, setLoop] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [align, setAlign] = useState<RadialTextAlign>("left");
  const [fontPreset, setFontPreset] = useState<FontPreset>("serif");
  const [demoOptions, setDemoOptions] = useState(INITIAL_DEMO_OPTIONS);
  const radialGeometry = useMemo<RadialTextGeometry>(
    () => createRadialGeometry(demoOptions),
    [demoOptions],
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
    setDemoOptions((current) => ({
      ...current,
      [id]: value,
    }));
  }

  return (
    <>
      <RadialText
        text={sampleArticle}
        shape={shape}
        loop={loop}
        geometry={radialGeometry}
        layout={radialLayout}
        typography={radialTypography}
        showGuides={showGuides}
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
              <div className="segmentedControl">
                {(["stadium", "ellipse"] satisfies RadialShapeKind[]).map((item) => (
                  <button
                    className={item === shape ? "segmentButton isActive" : "segmentButton"}
                    key={item}
                    type="button"
                    onClick={() => setShape(item)}
                  >
                    {item}
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

            {DEMO_SLIDERS.map((slider) => (
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
