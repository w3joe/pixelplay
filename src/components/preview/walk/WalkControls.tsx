"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { computeVenueLayout } from "@/lib/layout";
import type { PlayConfig } from "@/lib/types";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";

const EYE_HEIGHT_M = 1.7;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.2;
const WALL_MARGIN = 0.45;
/** How quickly velocity chases the input, and the eye chases the floor height. */
const MOVE_RESPONSE = 12;
const STEP_RESPONSE = 7;

/** Physical keys, so WASD still works on non-QWERTY layouts. */
const KEY_BINDINGS: Record<string, "forward" | "back" | "left" | "right"> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Pitch the view drops to when the tablet is called up with E. Comfortably past
 * the tablet's own engage threshold, so its yaw freezes and the crosshair can
 * sweep the whole face.
 */
const TABLET_VIEW_PITCH = -0.95;
/** Radians per second the view swings while snapping to or from the tablet. */
const SNAP_SPEED = 4.5;

const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

export function WalkControls({
  config,
  lockSelector,
  onLock,
  onUnlock,
  controlsRef,
}: {
  config: PlayConfig;
  lockSelector: string;
  onLock: () => void;
  onUnlock: () => void;
  controlsRef?: RefObject<PointerLockControlsImpl | null>;
}) {
  const { camera } = useThree();
  const layout = useMemo(() => computeVenueLayout(config), [config]);
  const { stage } = config;

  const keys = useRef({ forward: false, back: false, left: false, right: false, run: false });
  /** Pitch the view is swinging toward, or null when the mouse has the view. */
  const snapTarget = useRef<number | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const forwardVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const wish = useRef(new THREE.Vector3());

  // Drop the viewer into the room facing the stage.
  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT_M, layout.D * 0.28);
    camera.lookAt(0, EYE_HEIGHT_M, layout.stageZ);
    velocity.current.set(0, 0, 0);
  }, [camera, layout.D, layout.stageZ]);

  useEffect(() => {
    const setKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        keys.current.run = down;
        return;
      }
      // E calls the tablet up and puts it away again. Toggles off whatever the
      // current pitch is, so it works whether you got there by mouse or by key.
      if (e.code === "KeyE") {
        if (!down || e.repeat) return;
        e.preventDefault();
        tmpEuler.setFromQuaternion(camera.quaternion, "YXZ");
        snapTarget.current = tmpEuler.x < TABLET_VIEW_PITCH / 2 ? 0 : TABLET_VIEW_PITCH;
        return;
      }
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      // Stop arrow keys scrolling the page underneath the overlay.
      e.preventDefault();
      keys.current[action] = down;
    };

    const onDown = (e: KeyboardEvent) => setKey(e, true);
    const onUp = (e: KeyboardEvent) => setKey(e, false);
    // Losing focus mid-stride would otherwise leave a key stuck down.
    const clear = () => {
      keys.current = { forward: false, back: false, left: false, right: false, run: false };
    };

    // Moving the mouse hands the view straight back to the player mid-snap.
    const onMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) snapTarget.current = null;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [camera]);

  useFrame((_, rawDelta) => {
    // A backgrounded tab can hand back a huge delta; don't teleport on return.
    const dt = Math.min(rawDelta, 0.1);
    const k = keys.current;

    const forwardInput = (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const strafeInput = (k.right ? 1 : 0) - (k.left ? 1 : 0);

    camera.getWorldDirection(forwardVec.current);
    forwardVec.current.y = 0;
    forwardVec.current.normalize();
    rightVec.current.crossVectors(forwardVec.current, UP).normalize();

    wish.current
      .set(0, 0, 0)
      .addScaledVector(forwardVec.current, forwardInput)
      .addScaledVector(rightVec.current, strafeInput);
    if (wish.current.lengthSq() > 0) wish.current.normalize();
    wish.current.multiplyScalar(k.run ? RUN_SPEED : WALK_SPEED);

    velocity.current.lerp(wish.current, Math.min(1, dt * MOVE_RESPONSE));

    let x = camera.position.x + velocity.current.x * dt;
    let z = camera.position.z + velocity.current.z * dt;

    // Room walls
    const halfL = Math.max(layout.L / 2 - WALL_MARGIN, 0.5);
    const halfD = Math.max(layout.D / 2 - WALL_MARGIN, 0.5);
    x = THREE.MathUtils.clamp(x, -halfL, halfL);
    z = THREE.MathUtils.clamp(z, -halfD, halfD);

    // Standing on the deck rather than walking through it. Stages here are
    // ankle-to-knee height, so stepping up is the believable behaviour.
    const onStage =
      Math.abs(x) <= stage.lengthM / 2 &&
      z >= layout.stageZ - stage.widthM / 2 &&
      z <= layout.stageZ + stage.widthM / 2;

    camera.position.x = x;
    camera.position.z = z;

    const targetY = EYE_HEIGHT_M + (onStage ? stage.heightM : 0);
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetY,
      Math.min(1, dt * STEP_RESPONSE),
    );

    // Swing the view to or from the tablet after an E press.
    if (snapTarget.current !== null) {
      const target = snapTarget.current;
      tmpEuler.setFromQuaternion(camera.quaternion, "YXZ");
      const next = THREE.MathUtils.damp(tmpEuler.x, target, SNAP_SPEED, dt);
      tmpEuler.x = Math.abs(next - target) < 0.004 ? target : next;
      camera.quaternion.setFromEuler(tmpEuler);
      if (tmpEuler.x === target) snapTarget.current = null;
    }
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      makeDefault
      // Restrict the click-to-lock handler to the canvas surface, otherwise
      // drei binds it to the whole document and every HUD button re-locks.
      selector={lockSelector}
      onLock={onLock}
      onUnlock={onUnlock}
    />
  );
}
