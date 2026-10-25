"use client";

import { Canvas } from "@react-three/fiber";
import { BuilderScene } from "@/components/builder/BuilderScene";
import { SceneErrorBoundary } from "@/components/scene/ErrorBoundary";
import { usePlayStore } from "@/lib/store";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";

function NoWebGL() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="card max-w-sm p-6">
        <p className="font-pixel text-lg font-bold text-[var(--ink)]">3D isn&apos;t available here</p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          This browser can&apos;t start WebGL. Try a recent Chrome, Safari or Edge on a laptop or tablet.
        </p>
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const [webgl, setWebgl] = useState(true);
  // The walkthrough owns its own WebGL context; pause this one meanwhile.
  const walkMode = usePlayStore((s) => s.walkMode);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebgl(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  if (!webgl) return <NoWebGL />;

  return (
    <SceneErrorBoundary fallback={<NoWebGL />}>
      <Canvas
        orthographic
        shadows={{ type: THREE.PCFShadowMap }}
        frameloop={walkMode ? "never" : "always"}
        camera={{ position: [60, 60, 60], zoom: 30, near: 0.1, far: 2000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        dpr={[1, 2]}
        className="h-full w-full"
      >
        <Suspense fallback={null}>
          <BuilderScene />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  );
}
