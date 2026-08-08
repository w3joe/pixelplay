"use client";

import { Canvas } from "@react-three/fiber";
import { VenueScene } from "@/components/preview/VenueScene";
import { usePlayStore } from "@/lib/store";
import type { PlayConfig } from "@/lib/types";
import { Component, type ReactNode, Suspense, useEffect, useState } from "react";
import * as THREE from "three";

/* ---------------------------------------------------------------- fallback */

class PreviewErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function SvgFallback({ config }: { config: PlayConfig }) {
  const { venue, stage, screen } = config;
  const L = venue.lengthM;
  const D = venue.depthM;
  const sx = 14;
  const iso = (x: number, y: number, z: number) => {
    const X = (x - z) * sx * 0.866;
    const Y = (x + z) * sx * 0.5 - y * sx;
    return [X, Y] as const;
  };
  const floor = [
    iso(-L / 2, 0, -D / 2),
    iso(L / 2, 0, -D / 2),
    iso(L / 2, 0, D / 2),
    iso(-L / 2, 0, D / 2),
  ];
  const stagePts = [
    iso(-stage.lengthM / 2, stage.heightM, -D / 2 + 0.5),
    iso(stage.lengthM / 2, stage.heightM, -D / 2 + 0.5),
    iso(stage.lengthM / 2, stage.heightM, -D / 2 + 0.5 + stage.widthM),
    iso(-stage.lengthM / 2, stage.heightM, -D / 2 + 0.5 + stage.widthM),
  ];
  const poly = (pts: readonly (readonly [number, number])[]) =>
    pts.map((p) => p.join(",")).join(" ");

  return (
    <svg
      viewBox="-220 -180 440 360"
      className="h-full w-full"
      role="img"
      aria-label="Venue schematic"
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8eef6" />
          <stop offset="100%" stopColor="#c3cfdd" />
        </linearGradient>
      </defs>
      <rect x="-220" y="-180" width="440" height="360" fill="url(#bg)" />
      <polygon points={poly(floor)} fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
      <polygon points={poly(stagePts)} fill="#1b2530" stroke="#0f172a" strokeWidth="1" />
      <rect
        x={-screen.widthM * 6}
        y={-90 - screen.heightM * 8}
        width={screen.widthM * 12}
        height={screen.heightM * 10}
        rx="2"
        fill="#0d9b86"
        opacity="0.9"
      />
      <text x="-200" y="150" fontSize="11" fill="#64748b">
        3D schematic fallback
      </text>
    </svg>
  );
}

export { PreviewErrorBoundary, SvgFallback };

export function VenueCanvas({ config }: { config: PlayConfig }) {
  const [webgl, setWebgl] = useState(true);
  // While the fullscreen walkthrough is up it owns its own WebGL context, so
  // stop rendering this one rather than paying for two live scenes.
  const walkMode = usePlayStore((s) => s.walkMode);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
      setWebgl(ok);
    } catch {
      setWebgl(false);
    }
  }, []);

  const fallback = (
    <div className="h-full w-full bg-[#c3cfdd]">
      <SvgFallback config={config} />
    </div>
  );

  if (!webgl) return fallback;

  return (
    <PreviewErrorBoundary fallback={fallback}>
      <Canvas
        // Plain PCF: PCFSoft (R3F's default for `shadows`) is deprecated in
        // three r185, and drei's <SoftShadows> (PCSS) still unpacks
        // RGBA-encoded shadow depth this version no longer produces.
        // ContactShadows carries the soft ground contact instead.
        shadows={{ type: THREE.PCFShadowMap }}
        frameloop={walkMode ? "never" : "always"}
        camera={{ fov: 38, near: 0.1, far: 400, position: [18, 14, 20] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        dpr={[1, 2]}
        className="h-full w-full"
      >
        <Suspense fallback={null}>
          <VenueScene config={config} mode="orbit" />
        </Suspense>
      </Canvas>
    </PreviewErrorBoundary>
  );
}
