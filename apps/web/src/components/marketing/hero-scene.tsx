"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
});

/**
 * Interactive AI assistant robot that turns to follow the cursor, standing in for the
 * recruiter copilot. To use your own model, export a scene from Spline
 * (Export → Code → React) and replace this URL.
 */
export const HERO_SCENE_URL =
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

/**
 * Decorative Spline scene for the marketing hero. The runtime and scene (~2 MB) only
 * load on wide screens with motion allowed; elsewhere a static glow is shown instead.
 */
export function HeroScene({
  className = "",
}: {
  className?: string;
}): React.JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(wide.matches && !reduced.matches);
    update();
    wide.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      <div className="absolute top-1/2 left-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      {enabled && (
        <Spline
          scene={HERO_SCENE_URL}
          onLoad={() => setLoaded(true)}
          className={`pointer-events-auto absolute inset-0 transition-opacity duration-1000 ease-out ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {enabled && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
        </div>
      )}
    </div>
  );
}
