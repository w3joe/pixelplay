"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { createTestSignal, type TestSignalId } from "@/lib/audio/testSignals";
import {
  PA_ACOUSTIC_CENTRE_M,
  PA_CONE,
  SUB_ACOUSTIC_CENTRE_M,
  SUB_CROSSOVER_HZ,
  estimateSplAt,
  type SplReading,
} from "@/lib/engine/spl";
import { computeVenueLayout, speakerYaw, type Vec3 } from "@/lib/layout";
import type { PlayConfig } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const dbToGain = (db: number) => 10 ** (db / 20);

/**
 * Builds the listener/panner graph for the walkthrough. Positions come from
 * computeVenueLayout — the same source the visible speakers use — so what you
 * hear always lines up with what you can see.
 */
export function SpatialAudio({
  config,
  signalId,
  playing,
  volume,
}: {
  config: PlayConfig;
  signalId: TestSignalId;
  playing: boolean;
  volume: number;
}) {
  const { camera, scene } = useThree();
  const layout = useMemo(() => computeVenueLayout(config), [config]);
  const [listener, setListener] = useState<THREE.AudioListener | null>(null);
  const [voices, setVoices] = useState<THREE.PositionalAudio[]>([]);

  // One listener, riding the walk camera.
  useEffect(() => {
    const l = new THREE.AudioListener();
    camera.add(l);
    setListener(l);
    return () => {
      camera.remove(l);
      setListener(null);
    };
  }, [camera]);

  // One voice per box. Rebuilt when the rig or the source signal changes.
  useEffect(() => {
    if (!listener) return;
    const buffer = createTestSignal(listener.context, signalId);
    const created: THREE.PositionalAudio[] = [];

    const base = (refDistance: number, rolloff: number) => {
      const a = new THREE.PositionalAudio(listener);
      a.setBuffer(buffer);
      a.setLoop(true);
      a.setDistanceModel("inverse");
      a.setRefDistance(refDistance);
      a.setRolloffFactor(rolloff);
      a.setMaxDistance(500);
      return a;
    };

    for (const p of layout.speakers) {
      const a = base(1.4, 1.2);
      // Dispersion: standing off to the side of a PA box is quieter, and these
      // are the same numbers the SPL readout uses.
      a.setDirectionalCone(
        PA_CONE.innerAngleDeg,
        PA_CONE.outerAngleDeg,
        dbToGain(PA_CONE.outerGainDb),
      );
      a.position.set(p[0], PA_ACOUSTIC_CENTRE_M, p[2]);
      a.rotation.y = speakerYaw(p);
      scene.add(a);
      created.push(a);
    }

    for (const p of layout.subs) {
      // Subs are omnidirectional, band-limited, and carry further.
      const a = base(3, 0.8);
      const lp = listener.context.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = SUB_CROSSOVER_HZ;
      a.setFilter(lp);
      a.position.set(p[0], SUB_ACOUSTIC_CENTRE_M, p[2]);
      scene.add(a);
      created.push(a);
    }

    setVoices(created);

    // Dev-only handle so the audio graph can be asserted from a headless
    // browser, where nothing is actually audible.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __pixelplayAudio?: unknown }).__pixelplayAudio = {
        get state() {
          return listener.context.state;
        },
        get voices() {
          return created.length;
        },
        get playing() {
          return created.filter((a) => a.isPlaying).length;
        },
      };
    }

    return () => {
      for (const a of created) {
        if (a.isPlaying) a.stop();
        a.disconnect();
        scene.remove(a);
      }
      setVoices([]);
    };
  }, [listener, layout, signalId, scene]);

  // Transport. Every voice starts in the same tick so they stay aligned.
  useEffect(() => {
    if (!listener || voices.length === 0) return;
    if (playing) {
      // Browsers hand back a suspended context until a user gesture.
      void listener.context.resume();
      for (const a of voices) if (!a.isPlaying) a.play();
    } else {
      for (const a of voices) if (a.isPlaying) a.pause();
    }
  }, [playing, voices, listener]);

  useEffect(() => {
    listener?.setMasterVolume(volume);
  }, [listener, volume]);

  return null;
}

/**
 * Samples estimated SPL at the camera and reports it upward. Throttled — the
 * HUD does not need this at frame rate, and it would thrash React if it did.
 * Dynamically adjusts estimated dB SPL based on master volume slider.
 */
export function SplProbe({
  config,
  volume = 1,
  onReading,
  hz = 10,
}: {
  config: PlayConfig;
  volume?: number;
  onReading: (r: SplReading) => void;
  hz?: number;
}) {
  const { camera } = useThree();
  const layout = useMemo(() => computeVenueLayout(config), [config]);
  const accumulator = useRef(0);

  const sources = useMemo(
    () => ({
      speakers: layout.speakers.map((p) => ({
        position: [p[0], PA_ACOUSTIC_CENTRE_M, p[2]] as Vec3,
        yaw: speakerYaw(p),
      })),
      subs: layout.subs.map((p) => [p[0], SUB_ACOUSTIC_CENTRE_M, p[2]] as Vec3),
    }),
    [layout],
  );

  useFrame((_, delta) => {
    accumulator.current += delta;
    if (accumulator.current < 1 / hz) return;
    accumulator.current = 0;
    const listenerAt: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
    const rawReading = estimateSplAt(listenerAt, sources.speakers, sources.subs);

    // Scale dB SPL based on volume slider position: dB_offset = 20 * log10(volume)
    const volOffsetDb = volume > 0.001 ? 20 * Math.log10(volume) : -100;
    const scaledTotalDb = Math.max(0, rawReading.totalDb + volOffsetDb);

    onReading({
      ...rawReading,
      totalDb: scaledTotalDb,
      perSpeakerDb: rawReading.perSpeakerDb.map((db) => Math.max(0, db + volOffsetDb)),
    });
  });

  return null;
}
