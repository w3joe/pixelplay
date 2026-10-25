"use client";

import { RoundedBox } from "@react-three/drei";
import {
  CABINET,
  DARK_METAL,
  LedWall,
  METAL,
  MovingHead,
  ParCan,
  Speaker,
  StageFog,
  StageMesh,
  Subwoofer,
  Truss,
  hash,
} from "@/components/scene/fixtures";
import { baseY, footprintOf, originToCenter, stageOf } from "@/lib/builder/grid";
import type { Grid, Placement } from "@/lib/builder/types";

const DEG = Math.PI / 180;

/* ------------------------------------------------------------ extra fixtures */

function MicModel({ type }: { type: Placement["settings"]["mic"] }) {
  if (type === "rostrum") {
    return (
      <group>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 1.1, 0.46]} />
          <meshStandardMaterial color="#4a3426" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.13, -0.04]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.05, 0.5]} />
          <meshStandardMaterial color="#5b4231" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.6, 0.235]}>
          <planeGeometry args={[0.36, 0.2]} />
          <meshStandardMaterial color="#0d9b86" emissive="#0d9b86" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.18, 1.3, 0.05]} rotation={[0.6, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.36, 6]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
      </group>
    );
  }
  if (type === "headset") {
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.9, 10]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.09, 0.012, 8, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#1a222c" />
        </mesh>
        <mesh position={[0, 0.9, 0.05]} castShadow>
          <boxGeometry args={[0.07, 0.1, 0.03]} />
          <meshStandardMaterial color="#1a222c" />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 20]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 1.4, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 1.42, 0.06]} rotation={[0.9, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.016, 0.2, 10]} />
        <meshStandardMaterial color="#1a222c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.48, 0.13]} castShadow>
        <sphereGeometry args={[0.032, 12, 10]} />
        <meshStandardMaterial color="#8b97a5" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

function FogModel() {
  return (
    <group>
      <RoundedBox args={[0.5, 0.26, 0.34]} radius={0.03} smoothness={3} position={[0, 0.13, 0]} castShadow>
        <meshStandardMaterial {...CABINET} />
      </RoundedBox>
      <mesh position={[0, 0.16, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.08, 12]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.17, 0.27, 0.1]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#4dffd0" />
      </mesh>
    </group>
  );
}

function PhotoboothModel({ booth }: { booth: Placement["settings"]["booth"] }) {
  const accent = booth === "polaroid" ? "#ff8fa3" : booth === "roving" ? "#6aa8ff" : "#14d4b8";
  return (
    <group>
      {/* Floor mat */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.9, 1.9]} />
        <meshStandardMaterial color="#2b3541" roughness={0.9} />
      </mesh>
      {/* Backdrop */}
      <mesh position={[0, 1.1, -0.88]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 2.2, 0.06]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.25, -0.84]}>
        <planeGeometry args={[1.4, 1.2]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      {/* Camera on a stand, aimed at the backdrop */}
      <mesh position={[0, 0.65, 0.62]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 1.3, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <RoundedBox args={[0.3, 0.22, 0.18]} radius={0.03} smoothness={3} position={[0, 1.36, 0.62]} castShadow>
        <meshStandardMaterial color="#141b24" metalness={0.4} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.36, 0.52]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.2, 0.022, 10, 32]} />
        <meshBasicMaterial color="#fff6e0" />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- one item */

export interface ItemRenderOpts {
  beamOpacity: number;
  hasFog: boolean;
  /** Drag ghosts render without real lights so picking one up stays smooth. */
  lights?: boolean;
  shadows?: boolean;
}

/** The fixture itself, at the item's local origin (footprint centre, base height). */
export function ItemModel({
  p,
  grid,
  opts,
}: {
  p: Placement;
  grid: Grid;
  opts: ItemRenderOpts;
}) {
  const yaw = p.rotation * DEG;
  const lights = opts.lights ?? true;
  const { w, d } = footprintOf(p);
  const phase = hash(p.id.length * 31 + p.col * 7 + p.row * 3) * Math.PI * 2;

  switch (p.kind) {
    case "stage":
      return (
        <StageMesh
          lengthM={w - 0.04}
          widthM={d - 0.04}
          heightM={p.settings.height ?? 0.6}
          shape="rectangle"
          stageZ={0}
        />
      );
    case "led":
      return (
        <group rotation={[0, yaw, 0]}>
          <LedWall
            widthM={p.settings.width ?? 4}
            heightM={p.settings.height ?? 2}
            type={p.settings.screenType ?? "indoor_led"}
            y={0}
            z={-0.32}
            lights={lights}
          />
        </group>
      );
    case "speaker":
      return <Speaker position={[0, 0, 0]} yaw={yaw} />;
    case "sub":
      return <Subwoofer position={[0, 0, 0]} yaw={yaw} />;
    case "mic":
      return (
        <group rotation={[0, yaw, 0]}>
          <MicModel type={p.settings.mic} />
        </group>
      );
    case "par":
      return (
        <ParCan
          position={[0, 0, 0]}
          yaw={yaw - Math.PI}
          color={p.settings.color ?? "#ffb347"}
          hasFog={opts.hasFog}
          beamOpacity={opts.beamOpacity}
          lights={lights}
        />
      );
    case "truss": {
      const length = Math.max(w, d);
      const across = w >= d;
      return (
        <group rotation={[0, across ? 0 : Math.PI / 2, 0]}>
          <Truss length={length - 0.1} depth={0.14} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * (length - 0.1)) / 2, -grid.trussY / 2, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, grid.trussY, 10]} />
              <meshStandardMaterial {...METAL} />
            </mesh>
          ))}
        </group>
      );
    }
    case "mover":
      return (
        <MovingHead
          position={[0, -0.16, 0]}
          yaw={yaw - Math.PI}
          color={p.settings.color ?? "#6aa8ff"}
          phase={phase}
          beamOpacity={opts.beamOpacity}
          hasFog={opts.hasFog}
          lights={lights}
          shadows={opts.shadows ?? false}
        />
      );
    case "fog":
      return (
        <group rotation={[0, yaw, 0]}>
          <FogModel />
        </group>
      );
    case "photobooth":
      return (
        <group rotation={[0, yaw, 0]}>
          <PhotoboothModel booth={p.settings.booth} />
        </group>
      );
  }
}

/** Invisible pick volume per item — what the builder raycasts against. */
export function hitboxFor(p: Placement): { size: [number, number, number]; y: number } {
  const { w, d } = footprintOf(p);
  switch (p.kind) {
    case "stage": {
      const h = p.settings.height ?? 0.6;
      return { size: [w, h, d], y: h / 2 };
    }
    case "led": {
      const h = (p.settings.height ?? 2) + 0.2;
      return { size: [w * 0.95, h, d * 0.95], y: h / 2 };
    }
    case "speaker":
      return { size: [0.7, 1.9, 0.7], y: 0.95 };
    case "sub":
      return { size: [0.8, 0.7, 0.8], y: 0.35 };
    case "mic":
      return p.settings.mic === "rostrum" ? { size: [0.75, 1.3, 0.6], y: 0.65 } : { size: [0.45, 1.55, 0.45], y: 0.78 };
    case "par":
      return { size: [0.6, 1.7, 0.6], y: 0.85 };
    case "truss":
      return { size: [w, 0.45, d], y: 0 };
    case "mover":
      return { size: [0.55, 0.6, 0.55], y: -0.3 };
    case "fog":
      return { size: [0.7, 0.45, 0.6], y: 0.22 };
    case "photobooth":
      return { size: [w, 2.3, d], y: 1.15 };
  }
}

export function PlacedItem({
  p,
  placements,
  grid,
  opts,
  pickable = false,
}: {
  p: Placement;
  placements: Placement[];
  grid: Grid;
  opts: ItemRenderOpts;
  pickable?: boolean;
}) {
  const { w, d } = footprintOf(p);
  const [x, z] = originToCenter(grid, p.col, p.row, w, d);
  const y = baseY(p, placements, grid);
  const hit = pickable ? hitboxFor(p) : null;

  return (
    <group position={[x, y, z]}>
      <ItemModel p={p} grid={grid} opts={opts} />
      {hit ? (
        <mesh visible={false} position={[0, hit.y, 0]} userData={{ placementId: p.id }}>
          <boxGeometry args={hit.size} />
        </mesh>
      ) : null}
    </group>
  );
}

/** Every placed item, plus the haze cloud around the stage when there's a machine. */
export function PlacedItems({
  placements,
  grid,
  opts,
  pickable,
}: {
  placements: Placement[];
  grid: Grid;
  opts: ItemRenderOpts;
  pickable?: boolean;
}) {
  const stage = stageOf(placements);
  const fogOn = opts.hasFog;
  const sf = stage ? footprintOf(stage) : { w: 6, d: 3 };
  const [sx, sz] = stage ? originToCenter(grid, stage.col, stage.row, sf.w, sf.d) : [0, -grid.rows / 2 + 2];

  return (
    <group>
      {placements.map((p) => (
        <PlacedItem key={p.id} p={p} placements={placements} grid={grid} opts={opts} pickable={pickable} />
      ))}
      {fogOn ? (
        <group position={[sx, 0, 0]}>
          <StageFog active stageZ={sz} stageWidth={sf.d} stageLength={sf.w} />
        </group>
      ) : null}
    </group>
  );
}
