import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RadialDisc } from "./components/RadialDisc";
import { ControlsPanel } from "./components/ControlsPanel";
import type { RadialDiscHandle } from "./components/RadialDisc";
import type { AppShapeOptions, TypographyOptions } from "./lib/radial-renderer";
import { exportDiscAsPng } from "./export/png";
import { exportDiscAsSvg } from "./export/svg";

const DEFAULT_SHAPE_OPTIONS: AppShapeOptions = {
  scale: 1,
  innerRatioX: 0.44,
  innerRatioY: 0.44,
  align: "left",
  linePadding: 6,
  lineSpacing: 13,
  shapeX: 1,
  shapeY: 1,
  cornerRadius: 0.7,
  waveAmplitude: 0.35,
  waveCycles: 4,
};

const DEFAULT_ARTICLE_URL = "sample big.txt";

export type FontPresetId = "serif" | "sans" | "mono";

export interface FontPreset {
  id: FontPresetId;
  label: string;
  typography: TypographyOptions;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "serif",
    label: "serif",
    typography: {
      fontFamily: "Georgia, serif",
      bodySize: 9,
      headingSize: 11,
      bodyWeight: 400,
      headingWeight: 700,
    },
  },
  {
    id: "sans",
    label: "sans",
    typography: {
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      bodySize: 8.5,
      headingSize: 10.5,
      bodyWeight: 500,
      headingWeight: 700,
    },
  },
  {
    id: "mono",
    label: "mono",
    typography: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      bodySize: 8,
      headingSize: 9.5,
      bodyWeight: 500,
      headingWeight: 700,
    },
  },
];

export default function App() {
  const discRef = useRef<RadialDiscHandle>(null);
  const [shapeOptions, setShapeOptions] = useState<AppShapeOptions>(DEFAULT_SHAPE_OPTIONS);
  const [activeShape, setActiveShape] = useState<"stadium" | "ellipse" | "wave">("stadium");
  const [loop, setLoop] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showGuides, setShowGuides] = useState(true);
  const [fontPresetId, setFontPresetId] = useState<FontPresetId>("serif");
  const [articleText, setArticleText] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const typography = useMemo(
    () => FONT_PRESETS.find((p) => p.id === fontPresetId)!.typography,
    [fontPresetId],
  );

  useEffect(() => {
    fetch(DEFAULT_ARTICLE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Unable to load article: ${res.status}`);
        return res.text();
      })
      .then(setArticleText)
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleShapeOptionChange = useCallback(
    (key: keyof AppShapeOptions, value: number | string) => {
      setShapeOptions((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleThemeChange = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const handleExportPng = useCallback(async () => {
    if (isExporting || !discRef.current) return;
    setIsExporting(true);
    try {
      await exportDiscAsPng(discRef.current.discEl, "radial-text.png");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const handleExportSvg = useCallback(() => {
    if (!discRef.current) return;
    exportDiscAsSvg(discRef.current.discEl, "radial-text.svg");
  }, []);

  return (
    <>
      <RadialDisc
        ref={discRef}
        shapeOptions={shapeOptions}
        activeShape={activeShape}
        loop={loop}
        articleText={articleText}
        typography={typography}
        showGuides={showGuides}
      />
      <ControlsPanel
        shapeOptions={shapeOptions}
        activeShape={activeShape}
        loop={loop}
        theme={theme}
        showGuides={showGuides}
        fontPresetId={fontPresetId}
        isExporting={isExporting}
        onShapeOptionChange={handleShapeOptionChange}
        onShapeChange={(s) => setActiveShape(s)}
        onLoopChange={setLoop}
        onThemeChange={handleThemeChange}
        onShowGuidesChange={setShowGuides}
        onFontPresetChange={setFontPresetId}
        onTextLoad={setArticleText}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
      />
    </>
  );
}
