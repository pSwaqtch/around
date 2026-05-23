import { useState, useRef } from "react";
import type { AppShapeOptions } from "../lib/radial-renderer";

interface Props {
  shapeOptions: AppShapeOptions;
  activeShape: "stadium" | "ellipse";
  loop: boolean;
  theme: "light" | "dark";
  onShapeOptionChange: (key: keyof AppShapeOptions, value: number | string) => void;
  onShapeChange: (shape: "stadium" | "ellipse") => void;
  onLoopChange: (val: boolean) => void;
  onThemeChange: () => void;
  onTextLoad: (text: string) => void;
}

export function ControlsPanel({
  shapeOptions,
  activeShape,
  loop,
  theme,
  onShapeOptionChange,
  onShapeChange,
  onLoopChange,
  onThemeChange,
  onTextLoad,
}: Props) {
  const [open, setOpen] = useState(false);
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

  function sliderVal(raw: number, scale = 1): number {
    return Math.round(raw * scale);
  }

  return (
    <div id="controls">
      <div id="controls-header">
        <button
          id="themeToggle"
          onClick={onThemeChange}
          aria-label="Toggle theme"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? "◐" : "◑"}
        </button>
        <button id="hamburger" aria-label="Toggle controls" onClick={() => setOpen((o) => !o)}>
          &#9776;
        </button>
      </div>

      {open && (
        <div id="controls-panel">
          <div className="panel-section">
            <button
              className="ctrl-btn"
              onClick={() => onShapeChange(activeShape === "stadium" ? "ellipse" : "stadium")}
            >
              {activeShape === "stadium" ? "ellipse" : "stadium"}
            </button>
            <button
              className="ctrl-btn"
              onClick={() => onLoopChange(!loop)}
            >
              {loop ? "once" : "loop"}
            </button>
            <button
              className="ctrl-btn"
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

          <div className="panel-divider" />

          <SliderRow
            label="size"
            min={30} max={100}
            value={sliderVal(shapeOptions.scale, 100)}
            onChange={(v) => onShapeOptionChange("scale", v / 100)}
          />
          <SliderRow
            label="track"
            min={15} max={80}
            value={sliderVal(shapeOptions.innerRatio, 100)}
            onChange={(v) => onShapeOptionChange("innerRatio", v / 100)}
          />
          <SliderRow
            label="padding"
            min={0} max={20}
            value={shapeOptions.linePadding}
            onChange={(v) => onShapeOptionChange("linePadding", v)}
          />
          <SliderRow
            label="x"
            min={0} max={100}
            value={sliderVal(shapeOptions.shapeX, 100)}
            onChange={(v) => onShapeOptionChange("shapeX", v / 100)}
          />
          <SliderRow
            label="y"
            min={0} max={100}
            value={sliderVal(shapeOptions.shapeY, 100)}
            onChange={(v) => onShapeOptionChange("shapeY", v / 100)}
          />
          <SliderRow
            label="corner"
            min={0} max={100}
            value={sliderVal(shapeOptions.cornerRadius, 100)}
            onChange={(v) => onShapeOptionChange("cornerRadius", v / 100)}
          />

          <div className="panel-divider" />

          <div className="radio-group">
            {(["left", "justify", "right"] as const).map((val) => (
              <label key={val}>
                <input
                  type="radio"
                  name="align"
                  value={val}
                  checked={shapeOptions.align === val}
                  onChange={() => onShapeOptionChange("align", val)}
                />
                {val}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider-row">
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-val">{value}</span>
    </label>
  );
}
