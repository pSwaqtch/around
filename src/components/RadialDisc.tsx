import { useRef, useEffect } from "react";
import { createRadialArticleApp } from "../lib/radial-renderer";
import type { AppShapeOptions, RadialArticleApp } from "../lib/radial-renderer";

interface Props {
  shapeOptions: AppShapeOptions;
  activeShape: "stadium" | "ellipse";
  loop: boolean;
  articleText: string;
}

export function RadialDisc({ shapeOptions, activeShape, loop, articleText }: Props) {
  const discRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<HTMLDivElement>(null);
  const innerRingRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<RadialArticleApp | null>(null);

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

  useEffect(() => {
    appRef.current?.loadText(articleText);
  }, [articleText]);

  useEffect(() => {
    appRef.current?.setShape(activeShape);
  }, [activeShape]);

  useEffect(() => {
    appRef.current?.setOptions(shapeOptions);
  }, [shapeOptions]);

  useEffect(() => {
    appRef.current?.setLoop(loop);
  }, [loop]);

  return (
    <>
      <div id="disc" ref={discRef}>
        <div className="ring" id="outerRing" ref={outerRingRef} />
        <div className="ring" id="innerRing" ref={innerRingRef} />
      </div>
      <div id="status" ref={statusRef}>Loading…</div>
    </>
  );
}
