"use client";

import { RoundedBox } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  TABLET_H,
  TABLET_W,
  type TabletAction,
  type TabletState,
  draw,
  hitId,
  hitTest,
} from "@/components/preview/walk/tabletUi";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";

/** Physical size of the slab, in metres — roughly a 14" tablet. */
const SCREEN_W = 0.36;
const SCREEN_H = SCREEN_W * (TABLET_H / TABLET_W);
const BEZEL = 0.014;

/** Held low and tilted back, so it comes into frame as you look down. */
const HOLD_POSITION: [number, number, number] = [0, -0.5, -0.44];
const HOLD_TILT = -1.12;

const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

export function Tablet({
  state,
  onAction,
}: {
  state: TabletState;
  onAction: (a: TabletAction) => void;
}) {
  const { camera } = useThree();
  const rig = useRef<Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TABLET_W;
    c.height = TABLET_H;
    return c;
  }, []);

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx, state, hovered);
    texture.needsUpdate = true;
  }, [canvas, texture, state, hovered]);

  // Follow the camera's position and yaw but deliberately not its pitch: the
  // tablet is held in the hands, so looking down brings it into view instead
  // of it being pinned to the middle of the screen.
  useFrame(() => {
    if (!rig.current) return;
    tmpEuler.setFromQuaternion(camera.quaternion, "YXZ");
    rig.current.position.copy(camera.position);
    rig.current.rotation.y = tmpEuler.y;
  });

  const readUv = (e: ThreeEvent<PointerEvent>) => e.uv ?? null;

  return (
    <group ref={rig}>
      <group position={HOLD_POSITION} rotation={[HOLD_TILT, 0, 0]}>
        <RoundedBox
          args={[SCREEN_W + BEZEL * 2, SCREEN_H + BEZEL * 2, 0.012]}
          radius={0.008}
          smoothness={4}
          position={[0, 0, -0.008]}
        >
          <meshStandardMaterial color="#0b1119" metalness={0.55} roughness={0.42} />
        </RoundedBox>

        <mesh
          onPointerMove={(e) => {
            e.stopPropagation();
            const uv = readUv(e);
            setHovered(uv ? hitId(uv.x, uv.y) : null);
          }}
          onPointerOut={() => setHovered(null)}
          onPointerDown={(e) => {
            e.stopPropagation();
            const uv = readUv(e);
            if (!uv) return;
            const action = hitTest(uv.x, uv.y);
            if (!action) return;
            // Play is a toggle, but the hit test can't know the current state.
            onAction(
              action.type === "playing" ? { type: "playing", value: !state.playing } : action,
            );
          }}
        >
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          {/* Self-lit: a screen shouldn't dim with the house lights, and it
              stays readable at full blackout. */}
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>

        {/* Faint glow of the screen spilling onto the holder's hands */}
        <pointLight position={[0, 0, 0.25]} intensity={0.35} distance={1.2} color="#8fd8ff" />
      </group>
    </group>
  );
}
