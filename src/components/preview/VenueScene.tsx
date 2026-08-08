"use client";

import { ContactShadows, Environment, OrbitControls, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { computeVenueLayout } from "@/lib/layout";
import type { PlayConfig } from "@/lib/types";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type SceneMode = "orbit" | "walk";
/* ------------------------------------------------------------------ palette */

const METAL = { color: "#8b97a5", metalness: 0.85, roughness: 0.32 } as const;
const DARK_METAL = { color: "#3b4654", metalness: 0.7, roughness: 0.38 } as const;
const CABINET = { color: "#12181f", metalness: 0.25, roughness: 0.42 } as const;

/* --------------------------------------------------------------- fixtures */

/**
 * Three's punctual lights are physical: intensity is candela and falls off as
 * 1/d². These read against a key light of ~2 irradiance, so a fixture roughly
 * 4m away needs intensity ≈ 2 × 4² ≈ 32 just to match it — show lights sit
 * well above that so they actually punch through the house wash.
 */
const MOVER_ANGLE = 0.28; // ~16°, a tight profile beam
const MOVER_BEAM_LEN = 5;
const MOVER_INTENSITY = 240;

const PAR_ANGLE = 0.5; // ~29°, a broad wash
const PAR_INTENSITY = 150;
/** Cans stand downstage and tilt back toward the deck. */
const PAR_TILT = -1;

/** House lighting at full, before the dimmer scales it. */
const HOUSE = {
  ambient: 0.34,
  hemi: 0.6,
  key: 2.1,
  fill: 0.5,
  rim: 0.3,
  env: 0.4,
} as const;
/** Never quite black — you still need to find your way around the room. */
const BLACKOUT_AMBIENT = 0.03;

/** Deterministic 0..1 hash so crowd variation stays stable across renders. */
function hash(i: number, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** RoundedBox blows up if the radius reaches half the smallest dimension. */
function safeRadius(dims: number[], desired: number) {
  return Math.max(0.004, Math.min(desired, Math.min(...dims) * 0.32));
}

/* ------------------------------------------------------------- LED material */

const LED_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Self-luminous panel content: a slow flowing gradient, a periodic highlight
 * sweep, and — for LED types — the physical pixel-pitch grid that makes a wall
 * read as LED rather than as a painted rectangle.
 */
const LED_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3  uA;
  uniform vec3  uB;
  uniform vec2  uPitch;
  uniform float uGrid;
  uniform float uBright;

  void main() {
    vec2 uv = vUv;

    float w1 = sin(uv.x * 3.1 + uTime * 0.55) * 0.5 + 0.5;
    float w2 = sin((uv.y * 2.4 - uv.x * 1.6) + uTime * 0.85) * 0.5 + 0.5;
    vec3 col = mix(uA, uB, clamp(w1 * 0.55 + w2 * 0.55, 0.0, 1.0));

    // Highlight sweep travelling across the panel
    float head = fract(uTime * 0.11) * 1.7 - 0.35;
    col += vec3(0.3, 0.34, 0.36) * smoothstep(0.22, 0.0, abs(uv.x - head));

    // Vignette so the panel has some depth at the edges
    vec2 d = abs(uv - 0.5) * 2.0;
    col *= 1.0 - 0.18 * max(d.x, d.y);

    // LED pixel pitch, antialiased: widen the cell edge to the on-screen
    // footprint, then fade the grid out entirely once cells go sub-pixel.
    // Without this the wall turns into a moire mess at preview size.
    vec2 p = uv * uPitch;
    vec2 g = fract(p);
    vec2 w = fwidth(p);
    float ex = max(0.14, w.x);
    float ey = max(0.14, w.y);
    float cell =
      smoothstep(0.0, ex, g.x) * smoothstep(0.0, ex, 1.0 - g.x) *
      smoothstep(0.0, ey, g.y) * smoothstep(0.0, ey, 1.0 - g.y);
    float vis = 1.0 - smoothstep(0.3, 0.85, max(w.x, w.y));
    col *= mix(1.0, mix(0.72, 1.0, cell), uGrid * vis);

    gl_FragColor = vec4(col * uBright, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ---------------------------------------------------------------- structure */

/** Planar box truss: two chords plus a zig-zag web. Reads as real rigging. */
function Truss({ length, depth = 0.15 }: { length: number; depth?: number }) {
  const segs = Math.max(2, Math.round(length / 0.55));
  const seg = length / segs;
  const braceLen = Math.hypot(seg, depth * 2);
  const braceAngle = Math.atan2(depth * 2, seg);

  return (
    <group>
      {[depth, -depth].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, length, 8]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {Array.from({ length: segs }, (_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + seg * (i + 0.5), 0, 0]}
          rotation={[0, 0, i % 2 === 0 ? braceAngle : -braceAngle]}
          castShadow
        >
          <cylinderGeometry args={[0.016, 0.016, braceLen, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
    </group>
  );
}

function Floor({ lengthM, depthM }: { lengthM: number; depthM: number }) {
  const grid = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e8edf3";
    ctx.fillRect(0, 0, 512, 512);
    // One tile spans 8m: minor line every 0.5m, brand major every 2m. Denser
    // than this and the lines just alias into flat grey at preview size.
    ctx.strokeStyle = "rgba(71, 85, 105, 0.11)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(13, 155, 134, 0.16)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(lengthM / 8, depthM / 8);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [lengthM, depthM]);

  useEffect(() => () => grid.dispose(), [grid]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[lengthM + 1.5, depthM + 1.5]} />
      {/* A screen-space reflector was tried here and rejected: it crushed the
          floor to near-black, hid the grid, and stalled the GPU on ReadPixels. */}
      <meshStandardMaterial map={grid} roughness={0.62} metalness={0.12} color="#ffffff" />
    </mesh>
  );
}

function Walls({
  lengthM,
  depthM,
  ceilingM,
}: {
  lengthM: number;
  depthM: number;
  ceilingM: number | null;
}) {
  const h = Math.min(ceilingM ?? 3.2, 4.2);
  const t = 0.12;

  return (
    <group>
      <mesh position={[0, h / 2, -depthM / 2]} receiveShadow>
        <boxGeometry args={[lengthM + t * 2, h, t]} />
        <meshStandardMaterial color="#aebac7" roughness={0.95} transparent opacity={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * lengthM) / 2, h * 0.35, 0]} receiveShadow>
          <boxGeometry args={[t, h * 0.7, depthM]} />
          <meshStandardMaterial color="#bcc7d3" roughness={0.95} transparent opacity={0.3} />
        </mesh>
      ))}
      {ceilingM != null ? (
        <mesh position={[0, h + 0.05, -depthM * 0.15]}>
          <boxGeometry args={[lengthM * 0.95, 0.08, depthM * 0.55]} />
          <meshStandardMaterial color="#e6ecf3" roughness={1} transparent opacity={0.4} />
        </mesh>
      ) : null}
    </group>
  );
}

function StageMesh({
  lengthM,
  widthM,
  heightM,
  shape,
  stageZ,
}: {
  lengthM: number;
  widthM: number;
  heightM: number;
  shape: "rectangle" | "t_shape";
  stageZ: number;
}) {
  return (
    <group position={[0, 0, stageZ]}>
      {/* Deck */}
      <RoundedBox
        args={[lengthM, heightM, widthM]}
        radius={safeRadius([lengthM, heightM, widthM], 0.03)}
        smoothness={3}
        position={[0, heightM / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1b2530" roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* Brushed-aluminium edge trim around the deck lip */}
      <mesh position={[0, heightM - 0.012, 0]} receiveShadow>
        <boxGeometry args={[lengthM + 0.05, 0.035, widthM + 0.05]} />
        <meshStandardMaterial color="#9aa6b4" metalness={0.9} roughness={0.28} />
      </mesh>

      {/* Matte deck surface sitting just inside the trim */}
      <mesh position={[0, heightM + 0.008, 0]} receiveShadow>
        <boxGeometry args={[lengthM - 0.1, 0.02, widthM - 0.1]} />
        <meshStandardMaterial color="#232f3d" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Pleated front skirt */}
      <mesh position={[0, heightM / 2, widthM / 2 + 0.03]} castShadow>
        <boxGeometry args={[lengthM + 0.06, heightM, 0.05]} />
        <meshStandardMaterial color="#0b1017" roughness={0.95} metalness={0} />
      </mesh>

      {/* Stairs, stepping down toward the audience */}
      {[0, 1, 2].map((k) => {
        const h = (heightM * (k + 1)) / 3;
        return (
          <mesh
            key={k}
            position={[lengthM * 0.3, h / 2, widthM / 2 + (2 - k) * 0.32 + 0.18]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.05, h, 0.32]} />
            <meshStandardMaterial color="#1b2530" roughness={0.7} metalness={0.12} />
          </mesh>
        );
      })}

      {shape === "t_shape" ? (
        <RoundedBox
          args={[1.4, heightM, 2.6]}
          radius={safeRadius([1.4, heightM, 2.6], 0.03)}
          smoothness={3}
          position={[0, heightM / 2, widthM / 2 + 1.4]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1b2530" roughness={0.6} metalness={0.18} />
        </RoundedBox>
      ) : null}
    </group>
  );
}

function LedWall({
  widthM,
  heightM,
  type,
  y,
  z,
}: {
  widthM: number;
  heightM: number;
  type: PlayConfig["screen"]["type"];
  y: number;
  z: number;
}) {
  const isProj = type === "projector";
  const isOutdoor = type === "outdoor_led";

  const material = useMemo(() => {
    const a = isOutdoor ? "#0a3f8f" : isProj ? "#8f9aa8" : "#05564c";
    const b = isOutdoor ? "#39b6ff" : isProj ? "#e6ecf3" : "#19dcbb";
    return new THREE.ShaderMaterial({
      vertexShader: LED_VERT,
      fragmentShader: LED_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uA: { value: new THREE.Color(a) },
        uB: { value: new THREE.Color(b) },
        // Suggests cabinet pitch without out-running the preview's resolution
        uPitch: {
          value: new THREE.Vector2(
            THREE.MathUtils.clamp(widthM * 5, 8, 32),
            THREE.MathUtils.clamp(heightM * 5, 6, 20),
          ),
        },
        uGrid: { value: isProj ? 0 : 1 },
        uBright: { value: isProj ? 0.72 : isOutdoor ? 1.3 : 1.08 },
      },
    });
  }, [isProj, isOutdoor, widthM, heightM]);

  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  const spill = isOutdoor ? "#3b9eff" : isProj ? "#cbd5e1" : "#14d4b8";

  return (
    <group position={[0, y, z]}>
      {!isProj ? (
        <>
          {/* Ground-support towers and header truss */}
          {[-1, 1].map((s) => (
            <group key={s} position={[(s * (widthM + 0.34)) / 2, heightM / 2, 0]}>
              <group rotation={[0, 0, Math.PI / 2]}>
                <Truss length={heightM + 0.5} depth={0.1} />
              </group>
              <mesh position={[0, -heightM / 2 - 0.2, 0]} castShadow>
                <boxGeometry args={[0.5, 0.08, 0.7]} />
                <meshStandardMaterial {...DARK_METAL} />
              </mesh>
            </group>
          ))}
          <group position={[0, heightM + 0.32, 0]}>
            <Truss length={widthM + 0.7} depth={0.1} />
          </group>
        </>
      ) : null}

      {/* Cabinet frame behind the panel */}
      <RoundedBox
        args={[widthM + 0.18, heightM + 0.18, 0.16]}
        radius={safeRadius([widthM, heightM, 0.16], 0.03)}
        smoothness={3}
        position={[0, heightM / 2, -0.07]}
        castShadow
      >
        <meshStandardMaterial color="#0a0f16" roughness={0.55} metalness={0.4} />
      </RoundedBox>

      {/* Emissive panel face */}
      <mesh position={[0, heightM / 2, 0.021]}>
        <planeGeometry args={[widthM, heightM]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Additive halo selling the panel's brightness */}
      <mesh position={[0, heightM / 2, 0.05]}>
        <planeGeometry args={[widthM * 1.22, heightM * 1.3]} />
        <meshBasicMaterial
          color={spill}
          transparent
          opacity={isProj ? 0.05 : 0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {!isProj ? (
        <pointLight
          // Candela, not a 0-1 dial: at ~3m this is what it takes for a wall
          // this size to visibly throw colour onto the stage and performers.
          position={[0, heightM * 0.55, 1.4]}
          intensity={isOutdoor ? 80 : 48}
          color={spill}
          // Kept short: a wall this size lights the stage and the front rows,
          // it does not wash the whole hall teal.
          distance={15}
          decay={2}
        />
      ) : (
        <mesh position={[0, heightM / 2 + 0.9, -1.4]} castShadow>
          <boxGeometry args={[0.38, 0.26, 0.48]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
      )}
    </group>
  );
}

function Speaker({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;

  return (
    <group position={[x, 0, z]} rotation={[0, z > 0 ? Math.PI : 0, 0]}>
      {/* Tripod column and legs */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 1.16, 12]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.28, 0.06, Math.sin(a) * 0.28]}
            rotation={[0.55, -a, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, 0.72, 8]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
        );
      })}

      {/* Cabinet with the trapezoid-ish bevel of a real PA box */}
      <RoundedBox
        args={[0.46, 0.94, 0.4]}
        radius={0.035}
        smoothness={4}
        position={[0, 1.38, 0]}
        castShadow
      >
        <meshStandardMaterial {...CABINET} />
      </RoundedBox>

      {/* Perforated grill face */}
      <mesh position={[0, 1.38, 0.202]}>
        <planeGeometry args={[0.4, 0.86]} />
        <meshStandardMaterial color="#1b222c" roughness={0.9} metalness={0.3} />
      </mesh>
      {/* 15" woofer */}
      <mesh position={[0, 1.24, 0.208]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.16, 32]} />
        <meshStandardMaterial color="#2b3541" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, 1.24, 0.212]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.058, 20]} />
        <meshStandardMaterial color="#7d8a99" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Horn tweeter */}
      <mesh position={[0, 1.66, 0.206]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 4]} />
        <meshStandardMaterial color="#2b3541" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Power LED */}
      <mesh position={[0.15, 1.76, 0.205]}>
        <circleGeometry args={[0.016, 12]} />
        <meshBasicMaterial color="#4dffd0" />
      </mesh>
    </group>
  );
}

function Subwoofer({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.72, 0.66, 0.72]} radius={0.04} smoothness={4} position={[0, 0.33, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...CABINET} />
      </RoundedBox>
      <mesh position={[0, 0.33, 0.365]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.26, 32]} />
        <meshStandardMaterial color="#242c37" roughness={0.65} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.33, 0.368]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.078, 20]} />
        <meshStandardMaterial color="#6f7c8b" metalness={0.55} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Moving head that actually pans, with a soft volumetric beam. */
function MovingHead({
  position,
  color,
  phase,
  beamOpacity,
}: {
  position: [number, number, number];
  color: string;
  phase: number;
  beamOpacity: number;
}) {
  const pan = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  // Parenting the aim point to the tilt group is what makes the spot actually
  // track the head — three only honours light.target once it's in the graph.
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Pan turns the whole yoke; tilt only swings the head between the arms.
    if (pan.current) pan.current.rotation.y = Math.sin(t * 0.5 + phase) * 0.5;
    if (tilt.current) tilt.current.rotation.x = 0.62 + Math.sin(t * 0.33 + phase) * 0.12;
  });

  return (
    <group position={position}>
      {/* Clamp + body */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.1, 0.16, 0.1]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>
      <RoundedBox args={[0.26, 0.18, 0.26]} radius={0.03} smoothness={3} castShadow>
        <meshStandardMaterial color="#1a222c" metalness={0.5} roughness={0.35} />
      </RoundedBox>

      <group ref={pan}>
        {/* Yoke arms */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.13, -0.12, 0]} castShadow>
            <boxGeometry args={[0.04, 0.22, 0.12]} />
            <meshStandardMaterial {...DARK_METAL} />
          </mesh>
        ))}

        <group ref={tilt} position={[0, -0.18, 0]}>
          {/* Head */}
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.22, 16]} />
            <meshStandardMaterial color="#141b24" metalness={0.45} roughness={0.35} />
          </mesh>
          {/* Lens */}
          <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.085, 20]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* Beam cone — apex at the lens, half-angle matched to MOVER_ANGLE so
              the visible shaft and the lit pool agree. Depth-tested, so the
              floor and stage clip it where it lands. */}
          <mesh position={[0, -0.18 - MOVER_BEAM_LEN / 2, 0]}>
            <coneGeometry
              args={[Math.tan(MOVER_ANGLE) * MOVER_BEAM_LEN, MOVER_BEAM_LEN, 28, 1, true]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={beamOpacity}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <primitive object={target} position={[0, -20, 0]} />
          <spotLight
            target={target}
            position={[0, -0.2, 0]}
            angle={MOVER_ANGLE}
            penumbra={0.55}
            intensity={MOVER_INTENSITY}
            distance={38}
            decay={2}
            color={color}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-bias={-0.001}
            shadow-camera-near={0.5}
            shadow-camera-far={40}
          />
        </group>
      </group>
    </group>
  );
}

function ParCan({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const target = useMemo(() => new THREE.Object3D(), []);

  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.042, 1.44, 10]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.18, 0.04, Math.sin(a) * 0.18]} rotation={[0.5, -a, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.46, 6]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
        );
      })}

      {/* Lamp head. These stand downstage on the floor, so the can tilts back
          and up to wash the stage — everything below emits along local +Y. */}
      <group position={[0, 1.44, 0]} rotation={[PAR_TILT, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.13, 0.3, 16]} />
          <meshStandardMaterial color="#1a222c" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.14, 20]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* No volumetric shaft here on purpose: a wash this wide only shows a
            visible beam through haze, and the open cone's far rim reads as a
            big bright disc floating over the stage. The lit surfaces sell it. */}

        <primitive object={target} position={[0, 20, 0]} />
        <spotLight
          target={target}
          position={[0, 0.16, 0]}
          angle={PAR_ANGLE}
          penumbra={0.85}
          intensity={PAR_INTENSITY}
          distance={26}
          decay={2}
          color={color}
        />
      </group>
    </group>
  );
}

function LightRig({
  packageType,
  stageLength,
  stageWidth,
  stageZ,
  stageHeight,
  beamOpacity,
}: {
  packageType: PlayConfig["lighting"]["package"];
  stageLength: number;
  stageWidth: number;
  stageZ: number;
  stageHeight: number;
  beamOpacity: number;
}) {
  if (packageType === "none") return null;
  const showPar = packageType === "par_wash" || packageType === "both";
  const showMovers = packageType === "moving_heads" || packageType === "both";
  const y = stageHeight + 2.9;
  const barLength = Math.max(stageLength * 0.92, 2.5);

  return (
    <group>
      {showMovers ? (
        <>
          {/* Overhead truss on vertical legs */}
          <group position={[0, y, stageZ - 0.2]}>
            <Truss length={barLength} depth={0.14} />
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * barLength) / 2, y / 2, stageZ - 0.2]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, y, 10]} />
              <meshStandardMaterial {...METAL} />
            </mesh>
          ))}
          {[-0.34, 0, 0.34].map((t, i) => (
            <MovingHead
              key={i}
              position={[barLength * t, y - 0.16, stageZ - 0.2]}
              color={i === 1 ? "#14d4b8" : "#6aa8ff"}
              phase={i * 2.1}
              beamOpacity={beamOpacity}
            />
          ))}
        </>
      ) : null}

      {showPar
        ? [-0.42, 0.42].map((t, i) => (
            <ParCan
              key={i}
              // Stands go on the floor downstage of the deck — anywhere within
              // the stage footprint and they clip up through it.
              position={[stageLength * t * 0.75, 0, stageZ + stageWidth / 2 + 0.9]}
              color={i === 0 ? "#ffb347" : "#ff8fa3"}
            />
          ))
        : null}
    </group>
  );
}

const CROWD_COLORS = ["#3f4c5f", "#5b4550", "#414f47", "#6b6152", "#44506b", "#5a5a63"];
const SKIN_COLORS = ["#d9b48f", "#c69572", "#a9754f", "#8a5a3b", "#e2c2a0"];

function Audience({
  lengthM,
  depthM,
  stageWidth,
  maxPeople = 16,
}: {
  lengthM: number;
  depthM: number;
  stageWidth: number;
  maxPeople?: number;
}) {
  const people = useMemo(() => {
    const startZ = -depthM / 2 + stageWidth + 2.6;
    const endZ = depthM / 2 - 1.5;
    if (endZ <= startZ) return [];

    // In the preview a sparse crowd keeps focus on the AV kit; at eye level in
    // walk mode the same sparseness reads as an abandoned room, so fill in.
    const dense = maxPeople > 20;
    const rows = Math.max(2, Math.min(dense ? 8 : 4, Math.floor((endZ - startZ) / (dense ? 1.5 : 2.1))));
    const cols = Math.max(3, Math.min(dense ? 10 : 6, Math.floor(lengthM / (dense ? 1.9 : 2.8))));
    const keepBelow = dense ? 0.88 : 0.62;

    const list: {
      pos: [number, number, number];
      shirt: string;
      skin: string;
      scale: number;
      turn: number;
    }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        // Thin the grid out so the arrangement never reads as a lattice
        if (hash(i, 9) > keepBelow) continue;

        const baseX = -lengthM / 2 + 1.8 + c * ((lengthM - 3.6) / Math.max(cols - 1, 1));
        const baseZ = startZ + r * ((endZ - startZ) / Math.max(rows - 1, 1));

        list.push({
          pos: [
            baseX + (hash(i, 5) - 0.5) * 1.5,
            0,
            THREE.MathUtils.clamp(baseZ + (hash(i, 6) - 0.5) * 1.4, startZ, endZ),
          ],
          shirt: CROWD_COLORS[Math.floor(hash(i, 1) * CROWD_COLORS.length)],
          skin: SKIN_COLORS[Math.floor(hash(i, 2) * SKIN_COLORS.length)],
          scale: 0.9 + hash(i, 3) * 0.2,
          // Everyone roughly faces the stage, with a little natural scatter
          turn: (hash(i, 4) - 0.5) * 0.7,
        });
      }
    }
    return list.slice(0, maxPeople);
  }, [lengthM, depthM, stageWidth, maxPeople]);

  return (
    <group>
      {people.map((p, i) => (
        <group key={i} position={p.pos} scale={p.scale} rotation={[0, Math.PI + p.turn, 0]}>
          {/* Legs */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.26, 4, 8]} />
            <meshStandardMaterial color="#2f3742" roughness={0.9} />
          </mesh>
          {/* Torso */}
          <mesh position={[0, 0.62, 0]} castShadow>
            <capsuleGeometry args={[0.15, 0.3, 4, 10]} />
            <meshStandardMaterial color={p.shirt} roughness={0.85} />
          </mesh>
          {/* Shoulders */}
          <mesh position={[0, 0.76, 0]} castShadow>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshStandardMaterial color={p.shirt} roughness={0.85} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <sphereGeometry args={[0.115, 14, 12]} />
            <meshStandardMaterial color={p.skin} roughness={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Vertical gradient backdrop — far nicer than a flat clear colour. */
function Backdrop({ dim = 1 }: { dim?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color("#e8eef6") },
          uBottom: { value: new THREE.Color("#b9c6d6") },
          uDim: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() {
            vY = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vY;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform float uDim;
          void main() {
            vec3 col = mix(uBottom, uTop, smoothstep(-0.25, 0.6, vY));
            // Drop toward a cool near-black rather than grey as the house dims,
            // so a blackout doesn't leave a bright halo around the room.
            gl_FragColor = vec4(mix(vec3(0.012, 0.016, 0.026), col, uDim), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uDim.value = dim;
  }, [material, dim]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={110} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
function SceneControls({ lengthM, depthM }: { lengthM: number; depthM: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const targetY = 1.25;
  // Bias the pivot upstage so the stage and LED wall — the point of the
  // preview — sit near the centre of frame rather than the empty floor.
  const targetZ = -depthM * 0.2;
  const extent = Math.max(lengthM, depthM);
  const minDist = Math.max(4, extent * 0.25);
  const maxDist = extent * 2.8 + 18;
  const homeKey = `${lengthM}:${depthM}`;
  const lastHome = useRef("");

  useEffect(() => {
    if (homeKey === lastHome.current) return;
    lastHome.current = homeKey;
    const dist = extent * 0.72 + 5;
    camera.position.set(dist * 0.72, dist * 0.5, dist * 0.82);
    camera.near = 0.1;
    camera.far = 400;
    camera.updateProjectionMatrix();
    const c = controls.current;
    if (c) {
      c.target.set(0, targetY, targetZ);
      c.update();
    }
  }, [camera, extent, homeKey, targetY, targetZ]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableZoom
      enableRotate
      screenSpacePanning
      panSpeed={1}
      rotateSpeed={0.7}
      zoomSpeed={1}
      minDistance={minDist}
      maxDistance={maxDist}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      target={[0, targetY, targetZ]}
    />
  );
}


/* ------------------------------------------------------------------- scene */

/**
 * The venue itself, shared by both cameras. In `orbit` mode it owns the framing
 * controls for the small preview; in `walk` mode the camera belongs to
 * WalkControls, and the crowd is denser because a sparse room reads as empty
 * from eye level.
 */
export function VenueScene({
  config,
  mode = "orbit",
  houseLights = 1,
}: {
  config: PlayConfig;
  mode?: SceneMode;
  /** 1 = house lights up, 0 = blackout. Only the room wash dims; the rig doesn't. */
  houseLights?: number;
}) {
  const { venue, stage, screen, lighting } = config;
  const { L, D, stageZ, speakers, subs } = useMemo(() => computeVenueLayout(config), [config]);
  const groupRef = useRef<Group>(null);

  const hl = THREE.MathUtils.clamp(houseLights, 0, 1);
  // Beams are scattered light — barely visible in a bright room, obvious once
  // the house comes down. That inversion is most of the "lights off" effect.
  const beamOpacity = 0.05 + 0.2 * (1 - hl);
  const fogColor = useMemo(
    () => new THREE.Color("#c3cfdd").lerp(new THREE.Color("#05070c"), 1 - hl),
    [hl],
  );

  return (
    <>
      <Backdrop dim={hl} />
      <fog attach="fog" args={[fogColor, 34, 96]} />

      {mode === "orbit" ? <SceneControls lengthM={L} depthM={D} /> : null}

      {/* House wash: key / fill / rim, all under the dimmer */}
      <ambientLight intensity={BLACKOUT_AMBIENT + HOUSE.ambient * hl} />
      <hemisphereLight args={["#eaf2ff", "#7d8a99", HOUSE.hemi * hl]} />
      <directionalLight
        position={[12, 17, 9]}
        intensity={HOUSE.key * hl}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-far={60}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <directionalLight position={[-9, 7, -6]} intensity={HOUSE.fill * hl} color="#9fc4ff" />
      <directionalLight position={[0, 5, 16]} intensity={HOUSE.rim * hl} color="#dfe9f7" />

      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={HOUSE.env * hl} />
      </Suspense>

      <group ref={groupRef}>
        <Floor lengthM={L} depthM={D} />
        <Walls lengthM={L} depthM={D} ceilingM={venue.ceilingM} />

        <StageMesh
          lengthM={stage.lengthM}
          widthM={stage.widthM}
          heightM={stage.heightM}
          shape={stage.shape}
          stageZ={stageZ}
        />

        <LedWall
          widthM={screen.widthM}
          heightM={screen.heightM}
          type={screen.type}
          y={stage.heightM}
          z={stageZ - stage.widthM / 2 + 0.1}
        />

        {speakers.map((p, i) => (
          <Speaker key={`spk-${i}`} position={p} />
        ))}
        {subs.map((p, i) => (
          <Subwoofer key={`sub-${i}`} position={p} />
        ))}

        <LightRig
          packageType={lighting.package}
          stageLength={stage.lengthM}
          stageWidth={stage.widthM}
          stageZ={stageZ}
          stageHeight={stage.heightM}
          beamOpacity={lighting.package === "none" ? 0 : beamOpacity}
        />

        <Audience
          lengthM={L}
          depthM={D}
          stageWidth={stage.widthM}
          maxPeople={mode === "walk" ? 44 : 16}
        />
      </group>

      <ContactShadows
        position={[0, 0.015, 0]}
        opacity={0.34}
        scale={Math.max(L, D) * 1.5}
        blur={2.6}
        far={14}
        resolution={512}
      />
    </>
  );
}
