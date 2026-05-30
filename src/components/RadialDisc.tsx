import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { createRadialArticleApp } from "../lib/radial-renderer";
import { createLinearArticleApp } from "../lib/linear-renderer";
import type { AppShapeOptions, RadialArticleApp, TypographyOptions } from "../lib/radial-renderer";
import type { LinearArticleApp } from "../lib/linear-renderer";

type ArticleApp = RadialArticleApp | LinearArticleApp;

interface Props {
  shapeOptions: AppShapeOptions;
  activeShape: "stadium" | "ellipse" | "wave" | "recty" | "dna";
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
  const appRef = useRef<ArticleApp | null>(null);

  useImperativeHandle(ref, () => ({
    get discEl() { return discRef.current!; },
  }), []);

  // Initial app creation
  useEffect(() => {
    const isDna = activeShape === "dna";
    const app = isDna
      ? createLinearArticleApp({
          disc: discRef.current!,
          outerRing: outerRingRef.current!,
          innerRing: innerRingRef.current!,
          status: statusRef.current!,
          shapeOptions,
          typography,
        })
      : createRadialArticleApp({
          disc: discRef.current!,
          outerRing: outerRingRef.current!,
          innerRing: innerRingRef.current!,
          status: statusRef.current!,
        });
    app.start();
    appRef.current = app;
    return () => app.destroy();
  }, []);

  // Handle shape changes
  useEffect(() => {
    if (!appRef.current) return;
    const isDna = activeShape === "dna";
    const isCurrentAppDna = !('setShape' in appRef.current);

    // If switching between radial and DNA, recreate
    if (isDna !== isCurrentAppDna) {
      appRef.current.destroy();
      const app = isDna
        ? createLinearArticleApp({
            disc: discRef.current!,
            outerRing: outerRingRef.current!,
            innerRing: innerRingRef.current!,
            status: statusRef.current!,
            shapeOptions,
            typography,
          })
        : createRadialArticleApp({
            disc: discRef.current!,
            outerRing: outerRingRef.current!,
            innerRing: innerRingRef.current!,
            status: statusRef.current!,
          });
      app.start();
      app.loadText(articleText);
      appRef.current = app;
    } else if (!isDna) {
      // For radial shapes, just call setShape
      (appRef.current as RadialArticleApp).setShape(activeShape);
    }
  }, [activeShape, shapeOptions, typography]);

  useEffect(() => { appRef.current?.loadText(articleText); }, [articleText]);
  useEffect(() => { appRef.current?.setOptions(shapeOptions); }, [shapeOptions]);
  useEffect(() => { appRef.current?.setLoop(loop); }, [loop]);
  useEffect(() => { appRef.current?.setTypography(typography); }, [typography]);
  useEffect(() => { appRef.current?.setGuidesVisible(showGuides); }, [showGuides]);

  return (
    <>
      <div id="disc" ref={discRef}>
        <div className="ring" id="outerRing" ref={outerRingRef} />
        <div className="ring" id="innerRing" ref={innerRingRef} />
      </div>
      <div id="status" ref={statusRef}>Loading…</div>
    </>
  );
});
