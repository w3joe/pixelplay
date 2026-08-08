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
 * Builds the 3D spatial listener & panner audio graph for the walkthrough.
 * Positions come from computeVenueLayout — matching what you see on stage.
 * Subwoofers generate omnidirectional 3D low-end spatial response with proximity rumble.
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

  // One voice per speaker & subwoofer. Rebuilt when layout or test signal changes.
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

    // 1. Full-range Main PA Speakers
    for (const p of layout.speakers) {
      const a = base(1.4, 1.2);
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

    // 2. Subwoofers — 3D spatial low-frequency acoustic response
    for (const p of layout.subs) {
      // Subwoofers use near-field reference distance & stronger rolloff for proximity bass punch
      const a = base(1.2, 1.5);

      // Lowpass crossover filter with resonant Q for punchy low-end rumble
      const lp = listener.context.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = SUB_CROSSOVER_HZ;
      lp.Q.value = 2.0; // Warm low-end resonance peak near crossover

      a.setFilter(lp);
      a.position.set(p[0], SUB_ACOUSTIC_CENTRE_M, p[2]);
      scene.add(a);
      created.push(a);
    }

    setVoices(created);

    return () => {
      for (const a of created) {
        if (a.isPlaying) a.stop();
        a.disconnect();
        scene.remove(a);
      }
      setVoices([]);
    };
  }, [listener, layout, signalId, scene]);

  // Transport control
  useEffect(() => {
    if (!listener || voices.length === 0) return;

    const playVoices = () => {
      for (const a of voices) {
        if (!a.isPlaying) {
          try {
            a.play();
          } catch {
            // ignore
          }
        }
      }
    };

    const stopVoices = () => {
      for (const a of voices) {
        if (a.isPlaying) {
          try {
            a.pause();
          } catch {
            // ignore
          }
        }
      }
    };

    if (playing) {
      if (listener.context.state === "suspended") {
        listener.context
          .resume()
          .then(() => playVoices())
          .catch(() => playVoices());
      } else {
        playVoices();
      }
    } else {
      stopVoices();
    }
  }, [playing, voices, listener]);

  // Keep voices playing when AudioContext transitions to running
  useEffect(() => {
    if (!listener) return;
    const ctx = listener.context;
    const handleState = () => {
      if (ctx.state === "running" && playing && voices.length > 0) {
        for (const a of voices) {
          if (!a.isPlaying) {
            try {
              a.play();
            } catch {
              // ignore
            }
          }
        }
      }
    };
    ctx.addEventListener("statechange", handleState);
    return () => {
      ctx.removeEventListener("statechange", handleState);
    };
  }, [listener, playing, voices]);

  useEffect(() => {
    listener?.setMasterVolume(volume);
  }, [listener, volume]);

  return null;
}

/**
 * Samples estimated SPL at the camera position including subwoofer spatial proximity.
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
      perSubDb: rawReading.perSubDb.map((db) => Math.max(0, db + volOffsetDb)),
    });
  });

  return null;
}
