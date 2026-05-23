import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { createRadialArticleApp } from "../lib/radial-renderer";
import type { AppShapeOptions, RadialArticleApp, TypographyOptions } from "../lib/radial-renderer";

interface Props {
  shapeOptions: AppShapeOptions;
  activeShape: "stadium" | "ellipse";
  loop: boolean;
  articleText: string;
  typography: TypographyOptions;
  showGuides: boolean;
}

export interface RadialDiscHandle {
  discEl: HTMLDivElement;
}

export const RadialDisc = forwardRef<RadialDiscHandle, Props>(function RadialDisc(
  { shapeOptions, activeShape, loop, articleText, typography, showGuides },
  ref,
) {
  const discRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<HTMLDivElement>(null);
  const innerRingRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<RadialArticleApp | null>(null);

  useImperativeHandle(ref, () => ({
    get discEl() { return discRef.current!; },
  }), []);

  useEffect(() => {
    const app = createRadialArticleApp({
      disc: discRef.current!,
      outerRing: outerRingRef.current!,
      innerRing: innerRingRef.current!,
      status: statusRef.current!,
    });
    app.start();
    appRef.current = app;
    return () => app.destroy();
  }, []);

  useEffect(() => { appRef.current?.loadText(articleText); }, [articleText]);
  useEffect(() => { appRef.current?.setShape(activeShape); }, [activeShape]);
  useEffect(() => { appRef.current?.setOptions(shapeOptions); }, [shapeOptions]);
  useEffect(() => { appRef.current?.setLoop(loop); }, [loop]);
  useEffect(() => { appRef.current?.setTypography(typography); }, [typography]);

  return (
    <>
      <div id="disc" ref={discRef}>
        <div
          className="ring"
          id="outerRing"
          ref={outerRingRef}
          style={{ visibility: showGuides ? "visible" : "hidden" }}
        />
        <div
          className="ring"
          id="innerRing"
          ref={innerRingRef}
          style={{ visibility: showGuides ? "visible" : "hidden" }}
        />
      </div>
      <div id="status" ref={statusRef}>Loading…</div>
    </>
  );
});
