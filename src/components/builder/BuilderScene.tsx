"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useInsights } from "@/components/builder/useInsights";
import { Audience, Floor, HouseRig, beamOpacityFor } from "@/components/scene/fixtures";
import { ItemModel, PlacedItems } from "@/components/scene/items";
import { draftPlacement } from "@/lib/builder/autoplace";
import { CATALOG } from "@/lib/builder/catalog";
import { crowdCount, crowdSpots } from "@/lib/builder/crowd";
import {
  applyMove,
  baseY,
  deckHeightAt,
  footprintOf,
  originToCenter,
  pointToCell,
  pointToOrigin,
  stageOf,
  validateMove,
  validatePlacement,
} from "@/lib/builder/grid";
import type { Grid, Placement } from "@/lib/builder/types";
import { coverageVerdict } from "@/lib/engine/spl";
import { usePlayStore } from "@/lib/store";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** True isometric elevation: the camera looks down the cube diagonal. */
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
const CAMERA_DISTANCE = 120;
const DRAG_THRESHOLD_PX = 6;
const WALL_HEIGHT = 2.6;

const COLORS = {
  ok: new THREE.Color("#10b981"),
  bad: new THREE.Color("#ef4444"),
  select: new THREE.Color("#0d9b86"),
};

/* ------------------------------------------------------------------ helpers */

export function viewAzimuth(turns: number): number {
  return Math.PI / 4 + turns * (Math.PI / 2);
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

/* --------------------------------------------------------------- room shell */

function GridLines({ grid }: { grid: Grid }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const hx = grid.cols / 2;
    const hz = grid.rows / 2;
    for (let c = 0; c <= grid.cols; c++) pts.push(-hx + c, 0, -hz, -hx + c, 0, hz);
    for (let r = 0; r <= grid.rows; r++) pts.push(-hx, 0, -hz + r, hx, 0, -hz + r);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [grid.cols, grid.rows]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={[0, 0.012, 0]}>
      <lineBasicMaterial color="#64748b" transparent opacity={0.28} depthWrite={false} />
    </lineSegments>
  );
}

/**
 * Diorama shell: a chunky base slab and walls on the two sides facing away
 * from the camera only, so the room reads as a room without ever blocking it.
 */
function RoomShell({ grid, turns }: { grid: Grid; turns: number }) {
  const az = viewAzimuth(turns);
  const sx = Math.sin(az);
  const cz = Math.cos(az);
  const hx = grid.cols / 2;
  const hz = grid.rows / 2;
  const t = 0.18;
  const walls: { pos: [number, number, number]; size: [number, number, number] }[] = [];
  if (!grid.outdoor || grid.ceilingM != null) {
    if (cz > 0) walls.push({ pos: [0, WALL_HEIGHT / 2, -hz - t / 2], size: [grid.cols + t * 2, WALL_HEIGHT, t] });
    if (cz < 0) walls.push({ pos: [0, WALL_HEIGHT / 2, hz + t / 2], size: [grid.cols + t * 2, WALL_HEIGHT, t] });
    if (sx > 0) walls.push({ pos: [-hx - t / 2, WALL_HEIGHT / 2, 0], size: [t, WALL_HEIGHT, grid.rows + t * 2] });
    if (sx < 0) walls.push({ pos: [hx + t / 2, WALL_HEIGHT / 2, 0], size: [t, WALL_HEIGHT, grid.rows + t * 2] });
  }

  return (
    <group>
      {/* Top sits just under the floor plane so the two never z-fight. */}
      <mesh position={[0, -0.215, 0]} receiveShadow>
        <boxGeometry args={[grid.cols + 0.4, 0.4, grid.rows + 0.4]} />
        <meshStandardMaterial color={grid.outdoor ? "#8aa37a" : "#9aa8b8"} roughness={0.9} />
      </mesh>
      <Floor
        lengthM={grid.cols}
        depthM={grid.rows}
        showGrid={false}
        margin={0}
        tint={grid.outdoor ? "#d8e6cf" : "#eef2f6"}
      />
      <GridLines grid={grid} />
      {walls.map((w, i) => (
        <group key={i}>
          <mesh position={w.pos} receiveShadow castShadow>
            <boxGeometry args={w.size} />
            <meshStandardMaterial color="#dbe3ec" roughness={0.95} />
          </mesh>
          <mesh position={[w.pos[0], WALL_HEIGHT + 0.03, w.pos[2]]}>
            <boxGeometry args={[w.size[0] + 0.01, 0.06, w.size[2] + 0.01]} />
            <meshStandardMaterial color="#0d9b86" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------- overlays */

function FootprintTile({
  grid,
  p,
  y,
  color,
  opacity = 0.32,
}: {
  grid: Grid;
  p: Placement;
  y: number;
  color: THREE.Color;
  opacity?: number;
}) {
  const { w, d } = footprintOf(p);
  const [x, z] = originToCenter(grid, p.col, p.row, w, d);
  const outline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const hw = w / 2 - 0.03;
    const hd = d / 2 - 0.03;
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd], 3),
    );
    return g;
  }, [w, d]);
  useEffect(() => () => outline.dispose(), [outline]);

  return (
    <group position={[x, y + 0.025, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[w - 0.06, d - 0.06]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineLoop geometry={outline} renderOrder={3}>
        <lineBasicMaterial color={color} toneMapped={false} />
      </lineLoop>
    </group>
  );
}

/** Pulsing ring under whatever's selected. */
function SelectionMarker({ grid, p, placements }: { grid: Grid; p: Placement; placements: Placement[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 4) * 0.02;
  });
  const layer = CATALOG[p.kind].layer;
  // Overhead kit gets its marker on the floor too, so you can see where it hangs.
  const y = layer === "overhead" || layer === "rig" ? deckHeightAt(placements, p.col, p.row) : baseY(p, placements, grid);
  return (
    <group ref={ref}>
      <FootprintTile grid={grid} p={p} y={y} color={COLORS.select} opacity={0.22} />
    </group>
  );
}

/** Sound pressure painted onto the floor, one texel per grid cell. */
function SoundMap({ grid, heat }: { grid: Grid; heat: Float32Array }) {
  const texture = useMemo(() => {
    const data = new Uint8Array(grid.cols * grid.rows * 4);
    const tex = new THREE.DataTexture(data, grid.cols, grid.rows, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [grid.cols, grid.rows]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const data = texture.image.data as Uint8Array;
    const tones = {
      strong: [16, 185, 129],
      ok: [132, 204, 22],
      warn: [245, 158, 11],
      fail: [239, 68, 68],
    };
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const db = heat[r * grid.cols + c];
        // Texture rows run bottom-up, which after laying the plane flat is +Z first.
        const i = ((grid.rows - 1 - r) * grid.cols + c) * 4;
        if (!Number.isFinite(db)) {
          data[i + 3] = 0;
          continue;
        }
        const v = coverageVerdict(db);
        const rgb = db >= 88 ? tones.strong : v.tone === "ok" ? tones.ok : v.tone === "warn" ? tones.warn : tones.fail;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 150;
      }
    }
    texture.needsUpdate = true;
  }, [texture, heat, grid.cols, grid.rows]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} renderOrder={1}>
      <planeGeometry args={[grid.cols, grid.rows]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* --------------------------------------------------------------- controls */

/**
 * Camera and every pointer gesture on the canvas: pan, zoom, quarter-turn,
 * picking items, moving them, and dropping new ones dragged in from the
 * palette. Placement rules live in lib/builder/grid; this only translates
 * pointers into cells and asks.
 */
function BuilderControls({ itemsRef }: { itemsRef: RefObject<THREE.Group | null> }) {
  const { camera, gl, size } = useThree();
  const grid = usePlayStore((s) => s.grid);
  const turns = usePlayStore((s) => s.view.turns);
  const fitNonce = usePlayStore((s) => s.view.fitNonce);

  const target = useRef(new THREE.Vector3());
  const az = useRef(viewAzimuth(0));
  const zoomGoal = useRef(30);
  const fitZoom = useRef(30);
  const fitted = useRef(false);
  /** Set once the user pans or zooms, so a viewport resize doesn't yank the view back. */
  const userMoved = useRef(false);
  const lastFitKey = useRef("");

  // Frame the whole room when it changes, on "Fit room", or on resize if the
  // user hasn't taken the camera yet.
  useEffect(() => {
    if (!size.width || !size.height) return;
    const key = `${grid.cols}:${grid.rows}:${fitNonce}`;
    if (key !== lastFitKey.current) {
      lastFitKey.current = key;
      userMoved.current = false;
    } else if (userMoved.current) {
      return;
    }
    const span = grid.cols + grid.rows;
    const z = Math.min(size.width / (span * 0.72), size.height / (span * 0.42 + 3)) * 0.9;
    fitZoom.current = z;
    zoomGoal.current = z;
    target.current.set(0, 0, 0);
    if (!fitted.current) {
      const cam = camera as THREE.OrthographicCamera;
      cam.zoom = z;
      cam.updateProjectionMatrix();
      fitted.current = true;
    }
  }, [camera, grid.cols, grid.rows, size.width, size.height, fitNonce]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    az.current = THREE.MathUtils.damp(az.current, viewAzimuth(turns), 9, dt);
    const ce = Math.cos(ISO_ELEVATION);
    camera.position.set(
      target.current.x + CAMERA_DISTANCE * ce * Math.sin(az.current),
      target.current.y + CAMERA_DISTANCE * Math.sin(ISO_ELEVATION),
      target.current.z + CAMERA_DISTANCE * ce * Math.cos(az.current),
    );
    camera.lookAt(target.current);
    const cam = camera as THREE.OrthographicCamera;
    const nextZoom = THREE.MathUtils.damp(cam.zoom, zoomGoal.current, 14, dt);
    if (Math.abs(nextZoom - cam.zoom) > 1e-4) {
      cam.zoom = nextZoom;
      cam.updateProjectionMatrix();
    }
  });

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const store = usePlayStore;

    const inside = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const aim = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
    };
    const groundAt = (height: number): THREE.Vector3 | null => {
      plane.constant = -height;
      return raycaster.ray.intersectPlane(plane, hitPoint);
    };

    /** World point the pointer is over, at the height this kind of item lives. */
    const surfacePoint = (p: Placement, placements: Placement[]): THREE.Vector3 | null => {
      const { grid } = store.getState();
      const layer = CATALOG[p.kind].layer;
      if (layer === "overhead" || layer === "rig") return groundAt(grid.trussY)?.clone() ?? null;
      const stage = stageOf(placements.filter((x) => x.id !== p.id));
      if (stage && layer === "floor") {
        const deckY = stage.settings.height ?? 0.6;
        const onDeck = groundAt(deckY)?.clone();
        if (onDeck) {
          const cell = pointToCell(grid, onDeck.x, onDeck.z);
          if (deckHeightAt(placements, cell.col, cell.row) > 0) return onDeck;
        }
      }
      return groundAt(0)?.clone() ?? null;
    };

    const pick = (x: number, y: number): string | null => {
      if (!itemsRef.current) return null;
      aim(x, y);
      const hits = raycaster.intersectObject(itemsRef.current, true);
      for (const h of hits) {
        const id = h.object.userData?.placementId as string | undefined;
        if (id) return id;
      }
      return null;
    };

    // Gesture state
    let pan: { x: number; y: number; moved: boolean } | null = null;
    let press: { id: string; x: number; y: number; offset: { dc: number; dr: number } | null } | null = null;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: number | null = null;

    const setCursor = (c: string) => {
      if (el.style.cursor !== c) el.style.cursor = c;
    };

    const updateNewHover = (e: PointerEvent) => {
      const s = store.getState();
      const drag = s.drag;
      if (drag?.mode !== "new") return;
      if (!inside(e.clientX, e.clientY)) {
        s.setHover(null);
        return;
      }
      aim(e.clientX, e.clientY);
      const draft = draftPlacement(s.grid, drag.kind, 0, 0, s.event.type === "live_band_dj");
      const pt = surfacePoint(draft, s.placements);
      if (!pt) return s.setHover(null);
      const { w, d } = footprintOf(draft);
      const o = pointToOrigin(s.grid, pt.x, pt.z, w, d);
      const v = validatePlacement(s.grid, s.placements, { ...draft, col: o.col, row: o.row });
      s.setHover({ col: o.col, row: o.row, ok: v.ok, reason: v.reason });
    };

    const updateMoveHover = (e: PointerEvent) => {
      const s = store.getState();
      const drag = s.drag;
      if (drag?.mode !== "move" || !press?.offset) return;
      const p = s.placements.find((x) => x.id === drag.id);
      if (!p) return;
      aim(e.clientX, e.clientY);
      const pt = surfacePoint(p, s.placements);
      if (!pt) return;
      const cell = pointToCell(s.grid, pt.x, pt.z);
      const col = cell.col + press.offset.dc;
      const row = cell.row + press.offset.dr;
      const v = validateMove(s.grid, s.placements, p.id, col, row);
      s.setHover({ col, row, ok: v.ok, reason: v.reason });
    };

    const onDown = (e: PointerEvent) => {
      const s = store.getState();
      if (s.walkMode || s.drag) return;
      if (e.pointerType === "touch") {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          pinch = Math.hypot(a.x - b.x, a.y - b.y);
          pan = null;
          press = null;
          return;
        }
      }
      el.setPointerCapture(e.pointerId);
      const id = e.button === 0 ? pick(e.clientX, e.clientY) : null;
      if (id) {
        s.select(id);
        press = { id, x: e.clientX, y: e.clientY, offset: null };
        setCursor("grabbing");
      } else {
        pan = { x: e.clientX, y: e.clientY, moved: false };
        setCursor("grabbing");
      }
    };

    const onMove = (e: PointerEvent) => {
      const s = store.getState();
      if (s.walkMode) return;

      if (s.drag?.mode === "new") {
        updateNewHover(e);
        return;
      }

      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch !== null && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        userMoved.current = true;
        zoomGoal.current = THREE.MathUtils.clamp(
          zoomGoal.current * (dist / pinch),
          fitZoom.current * 0.5,
          fitZoom.current * 6,
        );
        pinch = dist;
        return;
      }

      if (press) {
        if (!press.offset) {
          if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD_PX) return;
          const p = s.placements.find((x) => x.id === press?.id);
          if (!p) return;
          // Grab offset, so the item doesn't jump to centre on the pointer.
          aim(press.x, press.y);
          const pt = surfacePoint(p, s.placements);
          const cell = pt ? pointToCell(s.grid, pt.x, pt.z) : { col: p.col, row: p.row };
          press.offset = { dc: p.col - cell.col, dr: p.row - cell.row };
          s.beginDrag({ mode: "move", id: p.id });
        }
        updateMoveHover(e);
        return;
      }

      if (pan) {
        const dx = e.clientX - pan.x;
        const dy = e.clientY - pan.y;
        if (!pan.moved && Math.hypot(dx, dy) < 3) return;
        pan.moved = true;
        userMoved.current = true;
        pan.x = e.clientX;
        pan.y = e.clientY;
        const zoom = (camera as THREE.OrthographicCamera).zoom;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        right.y = 0;
        right.normalize();
        const fwd = new THREE.Vector3(-Math.sin(az.current), 0, -Math.cos(az.current));
        target.current
          .addScaledVector(right, -dx / zoom)
          .addScaledVector(fwd, dy / (zoom * Math.sin(ISO_ELEVATION)));
        const { grid } = s;
        target.current.x = THREE.MathUtils.clamp(target.current.x, -grid.cols / 2, grid.cols / 2);
        target.current.z = THREE.MathUtils.clamp(target.current.z, -grid.rows / 2, grid.rows / 2);
        return;
      }

      // Idle hover: hint what's clickable.
      if (e.target === el && e.pointerType === "mouse") setCursor(pick(e.clientX, e.clientY) ? "pointer" : "grab");
    };

    const onUp = (e: PointerEvent) => {
      const s = store.getState();
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;

      if (s.drag?.mode === "new") {
        const drag = s.drag;
        const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD_PX;
        const hover = s.hover;
        if (!moved) s.autoAdd(drag.kind);
        else if (inside(e.clientX, e.clientY) && hover) {
          if (hover.ok) s.addAt(drag.kind, hover.col, hover.row);
          else if (hover.reason) s.showToast(hover.reason, "warn");
        }
        s.endDrag();
        return;
      }

      if (press) {
        if (s.drag?.mode === "move") {
          const hover = s.hover;
          if (hover?.ok) s.moveItem(s.drag.id, hover.col, hover.row);
          else if (hover?.reason) s.showToast(hover.reason, "warn");
          s.endDrag();
        }
        press = null;
      } else if (pan) {
        if (!pan.moved && e.button === 0) s.select(null);
        pan = null;
      }
      setCursor("grab");
    };

    const onCancel = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      pinch = null;
      pan = null;
      press = null;
      const s = store.getState();
      if (s.drag) s.endDrag();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const before = zoomGoal.current;
      const after = THREE.MathUtils.clamp(
        before * Math.exp(-e.deltaY * 0.0015),
        fitZoom.current * 0.5,
        fitZoom.current * 6,
      );
      zoomGoal.current = after;
      // Zoom toward the cursor: slide the pivot so the floor under the
      // pointer stays put on screen.
      aim(e.clientX, e.clientY);
      const under = groundAt(0);
      if (under) {
        const { grid } = store.getState();
        target.current.lerp(under, 1 - before / after);
        target.current.y = 0;
        target.current.x = THREE.MathUtils.clamp(target.current.x, -grid.cols / 2, grid.cols / 2);
        target.current.z = THREE.MathUtils.clamp(target.current.z, -grid.rows / 2, grid.rows / 2);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const s = store.getState();
      if (s.walkMode || s.phase !== "build" || s.quoteOpen || isTyping(e)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod && key === "d") {
        e.preventDefault();
        if (s.selectedId) s.duplicateItem(s.selectedId);
      } else if (mod) {
        return;
      } else if (key === "escape") {
        if (s.drag) s.endDrag();
        else s.select(null);
      } else if ((key === "delete" || key === "backspace") && s.selectedId) {
        e.preventDefault();
        s.removeItem(s.selectedId);
      } else if (key === "r" && s.selectedId) {
        s.rotateItem(s.selectedId);
      } else if (key === "q") {
        s.turnView(-1);
      } else if (key === "e") {
        s.turnView(1);
      }
    };

    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", noMenu);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    el.style.cursor = "grab";
    el.style.touchAction = "none";
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [camera, gl, itemsRef]);

  return null;
}

/* ------------------------------------------------------------------- scene */

export function BuilderScene() {
  const grid = usePlayStore((s) => s.grid);
  const placements = usePlayStore((s) => s.placements);
  const selectedId = usePlayStore((s) => s.selectedId);
  const drag = usePlayStore((s) => s.drag);
  const hover = usePlayStore((s) => s.hover);
  const view = usePlayStore((s) => s.view);
  const pax = usePlayStore((s) => s.event.pax);
  const deepStage = usePlayStore((s) => s.event.type === "live_band_dj");
  const { insights } = useInsights();
  const itemsRef = useRef<THREE.Group>(null);

  // While an item is being moved, draw the layout as it would be after the drop.
  const shown = useMemo(() => {
    if (drag?.mode === "move" && hover) return applyMove(placements, drag.id, hover.col, hover.row).next;
    return placements;
  }, [placements, drag, hover]);

  const ghost = useMemo(
    () =>
      drag?.mode === "new" && hover
        ? draftPlacement(grid, drag.kind, hover.col, hover.row, deepStage)
        : null,
    [drag, hover, grid, deepStage],
  );

  const crowd = useMemo(
    () => (view.showCrowd ? crowdSpots(grid, placements, crowdCount(pax, 40)) : []),
    [view.showCrowd, grid, placements, pax],
  );

  const houseLights = view.showMode ? 0.14 : 1;
  const hasFog = view.showMode && placements.some((p) => p.kind === "fog");
  const opts = { beamOpacity: beamOpacityFor(houseLights, hasFog), hasFog };
  const selected = shown.find((p) => p.id === selectedId);
  const moving = drag?.mode === "move" ? shown.find((p) => p.id === drag.id) : null;

  return (
    <>
      <HouseRig houseLights={houseLights} extent={Math.max(grid.cols, grid.rows) / 2 + 4} />
      <RoomShell grid={grid} turns={view.turns} />

      {view.soundMap ? <SoundMap grid={grid} heat={insights.heat} /> : null}

      <group ref={itemsRef}>
        <PlacedItems placements={shown} grid={grid} opts={opts} pickable />
      </group>

      {crowd.length && !view.soundMap ? <Audience spots={crowd} /> : null}

      {selected && !moving ? <SelectionMarker grid={grid} p={selected} placements={shown} /> : null}

      {moving && hover ? (
        <FootprintTile
          grid={grid}
          p={moving}
          y={CATALOG[moving.kind].layer === "deck" ? 0 : baseY(moving, shown, grid)}
          color={hover.ok ? COLORS.ok : COLORS.bad}
        />
      ) : null}

      {ghost && hover ? (
        <>
          <group
            position={(() => {
              const { w, d } = footprintOf(ghost);
              const [x, z] = originToCenter(grid, ghost.col, ghost.row, w, d);
              return [x, baseY(ghost, placements, grid), z] as [number, number, number];
            })()}
          >
            <ItemModel p={ghost} grid={grid} opts={{ ...opts, lights: false }} />
          </group>
          <FootprintTile
            grid={grid}
            p={ghost}
            y={CATALOG[ghost.kind].layer === "deck" ? 0 : baseY(ghost, placements, grid)}
            color={hover.ok ? COLORS.ok : COLORS.bad}
          />
        </>
      ) : null}

      <BuilderControls itemsRef={itemsRef} />
    </>
  );
}
