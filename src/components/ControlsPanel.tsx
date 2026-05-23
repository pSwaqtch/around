import { useState, useRef } from "react";
import type { AppShapeOptions } from "../lib/radial-renderer";
import { FONT_PRESETS } from "../App";
import type { FontPresetId } from "../App";

interface Props {
  shapeOptions: AppShapeOptions;
  activeShape: "stadium" | "ellipse";
  loop: boolean;
  theme: "light" | "dark";
  showGuides: boolean;
  fontPresetId: FontPresetId;
  isExporting: boolean;
  onShapeOptionChange: (key: keyof AppShapeOptions, value: number | string) => void;
  onShapeChange: (shape: "stadium" | "ellipse") => void;
  onLoopChange: (val: boolean) => void;
  onThemeChange: () => void;
  onShowGuidesChange: (val: boolean) => void;
  onFontPresetChange: (id: FontPresetId) => void;
  onTextLoad: (text: string) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
}

const SHAPES: Array<{ id: "stadium" | "ellipse"; label: string }> = [
  { id: "stadium", label: "stadium" },
  { id: "ellipse", label: "ellipse" },
];

const ALIGNMENTS: Array<AppShapeOptions["align"]> = ["left", "justify", "right"];

export function ControlsPanel({
  shapeOptions,
  activeShape,
  loop,
  theme,
  showGuides,
  fontPresetId,
  isExporting,
  onShapeOptionChange,
  onShapeChange,
  onLoopChange,
  onThemeChange,
  onShowGuidesChange,
  onFontPresetChange,
  onTextLoad,
  onExportPng,
  onExportSvg,
}: Props) {
  const [open, setOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") onTextLoad(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <aside className="controlDock" aria-label="Radial text controls">
      <button
        className="dockToggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        menu
      </button>

      {open && (
        <div className="controlPanel">
          {/* Shape */}
          <div className="controlRow">
            <span className="controlLabel">shape</span>
            <div className="segmentedControl">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={s.id === activeShape ? "segmentButton isActive" : "segmentButton"}
                  onClick={() => onShapeChange(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="controlRow">
            <span className="controlLabel">font</span>
            <div className="segmentedControl">
              {FONT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={p.id === fontPresetId ? "segmentButton isActive" : "segmentButton"}
                  onClick={() => onFontPresetChange(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="switchRow">
            <button
              type="button"
              className={loop ? "toggleButton isActive" : "toggleButton"}
              aria-pressed={loop}
              onClick={() => onLoopChange(!loop)}
            >
              {loop ? "loop" : "once"}
            </button>
            <button
              type="button"
              className={showGuides ? "toggleButton isActive" : "toggleButton"}
              aria-pressed={showGuides}
              onClick={() => onShowGuidesChange(!showGuides)}
            >
              guides
            </button>
            <button
              type="button"
              className={theme === "dark" ? "toggleButton isActive" : "toggleButton"}
              aria-pressed={theme === "dark"}
              onClick={onThemeChange}
            >
              dark
            </button>
          </div>

          {/* Export */}
          <div className="switchRow">
            <button
              type="button"
              className="toggleButton"
              disabled={isExporting}
              onClick={onExportPng}
            >
              {isExporting ? "…" : "png"}
            </button>
            <button
              type="button"
              className="toggleButton"
              onClick={onExportSvg}
            >
              svg
            </button>
            <button
              type="button"
              className="toggleButton"
              onClick={() => fileInputRef.current?.click()}
              title="Load a .txt file"
            >
              load file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>

          {/* Sliders */}
          <SliderRow label="width" min={0} max={100}
            value={Math.round(shapeOptions.shapeX * 100)}
            onChange={(v) => onShapeOptionChange("shapeX", v / 100)}
          />
          <SliderRow label="height" min={0} max={100}
            value={Math.round(shapeOptions.shapeY * 100)}
            onChange={(v) => onShapeOptionChange("shapeY", v / 100)}
          />
          <SliderRow label="inner" min={15} max={80}
            value={Math.round(shapeOptions.innerRatio * 100)}
            onChange={(v) => onShapeOptionChange("innerRatio", v / 100)}
          />
          <SliderRow label="corner" min={0} max={100}
            value={Math.round(shapeOptions.cornerRadius * 100)}
            onChange={(v) => onShapeOptionChange("cornerRadius", v / 100)}
          />
          <SliderRow label="scale" min={30} max={100}
            value={Math.round(shapeOptions.scale * 100)}
            onChange={(v) => onShapeOptionChange("scale", v / 100)}
          />
          <SliderRow label="inset" min={0} max={20}
            value={shapeOptions.linePadding}
            onChange={(v) => onShapeOptionChange("linePadding", v)}
          />

          {/* Alignment */}
          <div className="controlRow">
            <span className="controlLabel">align</span>
            <div className="segmentedControl">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={a === shapeOptions.align ? "segmentButton isActive" : "segmentButton"}
                  onClick={() => onShapeOptionChange("align", a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SliderRow({
  label, min, max, value, onChange,
}: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="sliderRow">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output>{value}</output>
    </label>
  );
}
