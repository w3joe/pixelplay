"use client";

import { ContactShadows } from "@react-three/drei";
import { Audience, Backdrop, Floor, HouseRig, Walls, beamOpacityFor } from "@/components/scene/fixtures";
import { PlacedItems } from "@/components/scene/items";
import { crowdCount, crowdSpots } from "@/lib/builder/crowd";
import { gridFor } from "@/lib/builder/grid";
import type { PlayConfig } from "@/lib/types";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * The room at eye level for the walkthrough. Everything stands exactly where
 * it was dropped in the builder, and the crowd is denser than in the builder
 * because a sparse room reads as empty from eye level.
 */
export function VenueScene({
  config,
  houseLights = 1,
  fogActive,
}: {
  config: PlayConfig;
  /** 1 = house lights up, 0 = blackout. Only the room wash dims; the rig doesn't. */
  houseLights?: number;
  /** Triggered fog effect */
  fogActive?: boolean;
}) {
  const grid = useMemo(() => gridFor(config.venue), [config.venue]);
  const placements = useMemo(() => config.placements ?? [], [config.placements]);
  const hasFog = fogActive ?? config.lighting.fogMachine ?? false;
  const hl = THREE.MathUtils.clamp(houseLights, 0, 1);
  const crowd = useMemo(
    () => crowdSpots(grid, placements, crowdCount(config.event.pax, 60)),
    [grid, placements, config.event.pax],
  );
  const fogColor = useMemo(
    () => new THREE.Color(hasFog ? "#9cb2c6" : "#c3cfdd").lerp(new THREE.Color("#05070c"), 1 - hl),
    [hl, hasFog],
  );

  return (
    <>
      <Backdrop dim={hl} />
      <fog attach="fog" args={[fogColor, hasFog ? 4 : 34, hasFog ? 38 : 96]} />
      <HouseRig houseLights={hl} extent={Math.max(grid.cols, grid.rows) / 2 + 4} />

      <Floor lengthM={grid.cols} depthM={grid.rows} tint={grid.outdoor ? "#dfe8d8" : "#e8edf3"} />
      {grid.outdoor && grid.ceilingM == null ? null : (
        <Walls lengthM={grid.cols} depthM={grid.rows} ceilingM={config.venue.ceilingM} />
      )}

      <PlacedItems
        placements={placements}
        grid={grid}
        opts={{ beamOpacity: beamOpacityFor(hl, hasFog), hasFog, shadows: true }}
      />
      <Audience spots={crowd} />

      <ContactShadows
        position={[0, 0.015, 0]}
        opacity={0.34}
        scale={Math.max(grid.cols, grid.rows) * 1.5}
        blur={2.6}
        far={14}
        resolution={512}
      />
    </>
  );
}
