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

/** Physical size of the slab, in metres. */
const SCREEN_W = 0.44;
const SCREEN_H = SCREEN_W * (TABLET_H / TABLET_W);
const BEZEL = 0.016;

/** Held low and tilted back, so it comes into frame as you look down. */
const HOLD_POSITION: [number, number, number] = [0, -0.46, -0.42];
const HOLD_TILT = -1.12;

/**
 * Drawn after everything else with depth testing off. You can walk through the
 * crowd, so without this a guest standing on your toes renders in front of the
 * tablet you're holding.
 */
const ON_TOP = 1000;

const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * Below this pitch the tablet is "raised" and its yaw freezes, so mouse-look
 * sweeps the crosshair across its face instead of dragging the tablet along.
 * Without this the tablet tracks yaw rigidly, sits dead-centre forever, and
 * every control outside the middle column is unreachable.
 */
const ENGAGE_PITCH = -0.62;
/** If you turn this far while raised, let it follow again so it can't be lost. */
const MAX_YAW_OFFSET = 0.5;

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

  const heldYaw = useRef(0);
  const raised = useRef(false);

  // Follows position always, and yaw only while lowered — never pitch, so
  // looking down brings it into view rather than pinning it to the screen.
  useFrame(() => {
    if (!rig.current) return;
    tmpEuler.setFromQuaternion(camera.quaternion, "YXZ");
    const yaw = tmpEuler.y;

    if (tmpEuler.x > ENGAGE_PITCH) {
      // Lowered: carried along with the body.
      heldYaw.current = yaw;
      raised.current = false;
    } else {
      if (!raised.current) {
        heldYaw.current = yaw;
        raised.current = true;
      }
      // Raised: yaw is frozen so the crosshair can sweep across the face,
      // but it gives chase if you turn far enough to lose it.
      const delta = Math.atan2(
        Math.sin(yaw - heldYaw.current),
        Math.cos(yaw - heldYaw.current),
      );
      if (Math.abs(delta) > MAX_YAW_OFFSET) {
        heldYaw.current += delta - Math.sign(delta) * MAX_YAW_OFFSET;
      }
    }

    rig.current.position.copy(camera.position);
    rig.current.rotation.y = heldYaw.current;
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
          renderOrder={ON_TOP}
        >
          <meshStandardMaterial
            color="#0b1119"
            metalness={0.55}
            roughness={0.42}
            depthTest={false}
          />
        </RoundedBox>

        <mesh
          renderOrder={ON_TOP + 1}
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
          <meshBasicMaterial map={texture} toneMapped={false} depthTest={false} />
        </mesh>

        {/* Faint glow of the screen spilling onto the holder's hands */}
        <pointLight position={[0, 0, 0.25]} intensity={0.35} distance={1.2} color="#8fd8ff" />
      </group>
    </group>
  );
}
