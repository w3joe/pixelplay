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
 * Brought up close and squared-on once raised, so the panel fills more of the
 * frame and its (fixed-resolution) canvas text reads noticeably bigger without
 * having to redraw it at a different font size.
 *
 * Kept well short of the camera's FOV on purpose: at 1.85x/0.22m — the first
 * cut of this — the panel's half-angle exceeded both the yaw chase budget and
 * the camera's own half-FOV, so reaching a far corner meant turning further
 * than the tablet allowed itself to be chased, and it slid away before the
 * crosshair ever caught up. These numbers leave headroom on both.
 */
const RAISED_POSITION: [number, number, number] = [0, -0.34, -0.32];
const RAISED_TILT = -1.05;
const RAISED_SCALE = 1.45;
/** How quickly the zoom eases in and out of the raised pose. */
const ZOOM_RESPONSE = 9;

/**
 * Drawn after everything else with depth testing off. You can walk through the
 * crowd, so without this a guest standing on your toes renders in front of the
 * tablet you're holding.
 */
const ON_TOP = 1000;

const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * Below this pitch the tablet raises and its yaw freezes, so mouse-look sweeps
 * the crosshair across its face instead of dragging the tablet along. Without
 * this the tablet tracks yaw rigidly, sits dead-centre forever, and every
 * control outside the middle column is unreachable.
 */
const ENGAGE_PITCH = -0.62;
/**
 * Once raised, it takes looking back up nearly level to dismiss it — not the
 * stricter ENGAGE_PITCH. Reaching the top row of a close, zoomed-in panel
 * means pitching up past the entry threshold; without this hysteresis the
 * tablet would un-raise itself the moment you tried to look at its own header.
 */
const RAISE_HOLD_PITCH = -0.12;
/**
 * If you turn this far while raised, let it follow again so it can't be lost.
 * Sized with headroom over the panel's own half-angle at RAISED_SCALE/POSITION
 * — too tight here and a far corner recedes as fast as you turn toward it.
 */
const MAX_YAW_OFFSET = 0.95;

export function Tablet({
  state,
  onAction,
}: {
  state: TabletState;
  onAction: (a: TabletAction) => void;
}) {
  const { camera } = useThree();
  const rig = useRef<Group>(null);
  const held = useRef<Group>(null);
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
  /** 0 = walking pose, 1 = fully raised/zoomed. Eased, not a snap. */
  const zoom = useRef(0);

  // Follows position always, and yaw only while lowered — never pitch, so
  // looking down brings it into view rather than pinning it to the screen.
  useFrame((_, rawDelta) => {
    if (!rig.current || !held.current) return;
    const dt = Math.min(rawDelta, 0.1);
    tmpEuler.setFromQuaternion(camera.quaternion, "YXZ");
    const yaw = tmpEuler.y;

    // Hysteresis: strict threshold to raise it, lenient one to drop it, so
    // looking up at the panel's own top edge doesn't dismiss the panel.
    const unraiseAt = raised.current ? RAISE_HOLD_PITCH : ENGAGE_PITCH;
    if (tmpEuler.x > unraiseAt) {
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

    // Ease toward the walking pose or the raised/zoomed one, whichever the
    // pitch check above just decided. Triggers identically whether "raised"
    // was reached by pressing E (which snaps pitch) or by free mouse-look.
    zoom.current = THREE.MathUtils.damp(
      zoom.current,
      raised.current ? 1 : 0,
      ZOOM_RESPONSE,
      dt,
    );
    const t = zoom.current;
    held.current.position.set(
      THREE.MathUtils.lerp(HOLD_POSITION[0], RAISED_POSITION[0], t),
      THREE.MathUtils.lerp(HOLD_POSITION[1], RAISED_POSITION[1], t),
      THREE.MathUtils.lerp(HOLD_POSITION[2], RAISED_POSITION[2], t),
    );
    held.current.rotation.x = THREE.MathUtils.lerp(HOLD_TILT, RAISED_TILT, t);
    held.current.scale.setScalar(THREE.MathUtils.lerp(1, RAISED_SCALE, t));
  });

  const readUv = (e: ThreeEvent<PointerEvent>) => e.uv ?? null;

  return (
    <group ref={rig}>
      <group ref={held} position={HOLD_POSITION} rotation={[HOLD_TILT, 0, 0]}>
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
            const ctx = THREE.AudioContext.getContext() as unknown as AudioContext;
            if (ctx && ctx.state === "suspended") {
              void ctx.resume();
            }
            const uv = readUv(e);
            if (!uv) return;
            const action = hitTest(uv.x, uv.y);
            if (!action) return;
            // Play and Fog are toggles, but the hit test can't know the current state.
            onAction(
              action.type === "playing"
                ? { type: "playing", value: !state.playing }
                : action.type === "fog"
                  ? { type: "fog", value: !state.fogActive }
                  : action,
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
