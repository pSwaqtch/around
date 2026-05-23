import { useState, useEffect, useCallback } from "react";
import { RadialDisc } from "./components/RadialDisc";
import { ControlsPanel } from "./components/ControlsPanel";
import type { AppShapeOptions } from "./lib/radial-renderer";

const DEFAULT_SHAPE_OPTIONS: AppShapeOptions = {
  scale: 1,
  innerRatio: 0.44,
  align: "left",
  linePadding: 6,
  shapeX: 0.3,
  shapeY: 0,
  cornerRadius: 1,
};

const DEFAULT_ARTICLE_URL = "sample big.txt";

export default function App() {
  const [shapeOptions, setShapeOptions] = useState<AppShapeOptions>(DEFAULT_SHAPE_OPTIONS);
  const [activeShape, setActiveShape] = useState<"stadium" | "ellipse">("stadium");
  const [loop, setLoop] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [articleText, setArticleText] = useState("");

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

  return (
    <>
      <RadialDisc
        shapeOptions={shapeOptions}
        activeShape={activeShape}
        loop={loop}
        articleText={articleText}
      />
      <ControlsPanel
        shapeOptions={shapeOptions}
        activeShape={activeShape}
        loop={loop}
        theme={theme}
        onShapeOptionChange={handleShapeOptionChange}
        onShapeChange={setActiveShape}
        onLoopChange={setLoop}
        onThemeChange={handleThemeChange}
        onTextLoad={setArticleText}
      />
    </>
  );
}
