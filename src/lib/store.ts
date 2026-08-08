"use client";

import { createDefaultConfig } from "@/lib/defaults";
import { maxLedHeightM } from "@/lib/engine/led";
import { recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { suggestStageLengthM, suggestStageWidthM } from "@/lib/engine/stage";
import { getVenueById } from "@/lib/venues/singapore";
import type {
  AudioConfig,
  EventConfig,
  ExtrasConfig,
  LightingConfig,
  PlayConfig,
  ScreenConfig,
  StageConfig,
  VenueConfig,
  WizardStep,
} from "@/lib/types";
import { WIZARD_STEPS } from "@/lib/types";
import { create } from "zustand";

interface PlayStore {
  step: WizardStep;
  config: PlayConfig;
  previewExpanded: boolean;
  walkMode: boolean;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setVenue: (patch: Partial<VenueConfig>) => void;
  selectLibraryVenue: (id: string) => void;
  setManualVenue: () => void;
  setEvent: (patch: Partial<EventConfig>) => void;
  setStage: (patch: Partial<StageConfig>) => void;
  applyStageSuggestions: () => void;
  setScreen: (patch: Partial<ScreenConfig>) => void;
  clampScreenToSafeHeight: () => void;
  setAudio: (patch: Partial<AudioConfig>) => void;
  applyAudioSuggestions: () => void;
  setLighting: (patch: Partial<LightingConfig>) => void;
  setExtras: (patch: Partial<ExtrasConfig>) => void;
  setPreviewExpanded: (v: boolean) => void;
  setWalkMode: (v: boolean) => void;
}

export const usePlayStore = create<PlayStore>((set, get) => ({
  step: "venue",
  config: createDefaultConfig(),
  previewExpanded: false,
  walkMode: false,

  setStep: (step) => set({ step }),

  nextStep: () => {
    const idx = WIZARD_STEPS.indexOf(get().step);
    if (idx < WIZARD_STEPS.length - 1) set({ step: WIZARD_STEPS[idx + 1] });
  },

  prevStep: () => {
    const idx = WIZARD_STEPS.indexOf(get().step);
    if (idx > 0) set({ step: WIZARD_STEPS[idx - 1] });
  },

  setVenue: (patch) =>
    set((s) => ({ config: { ...s.config, venue: { ...s.config.venue, ...patch } } })),

  selectLibraryVenue: (id) => {
    const v = getVenueById(id);
    if (!v) return;
    set((s) => ({
      config: {
        ...s.config,
        venue: {
          mode: "library",
          libraryId: v.id,
          name: v.name,
          kind: v.kind,
          areaSqft: v.areaSqft,
          lengthM: v.lengthM,
          depthM: v.depthM,
          ceilingM: v.ceilingM,
          power: v.power,
          powerNote: v.powerNote,
          inHouseAudio: v.inHouseAudioLikely,
        },
      },
    }));
  },

  setManualVenue: () =>
    set((s) => ({
      config: {
        ...s.config,
        venue: {
          ...s.config.venue,
          mode: "manual",
          libraryId: null,
          name: s.config.venue.name || "Custom venue",
        },
      },
    })),

  setEvent: (patch) =>
    set((s) => ({ config: { ...s.config, event: { ...s.config.event, ...patch } } })),

  setStage: (patch) =>
    set((s) => ({ config: { ...s.config, stage: { ...s.config.stage, ...patch } } })),

  applyStageSuggestions: () => {
    const { venue, stage } = get().config;
    set((s) => ({
      config: {
        ...s.config,
        stage: {
          ...s.config.stage,
          lengthM: suggestStageLengthM(venue.kind, venue.lengthM),
          widthM: suggestStageWidthM(stage.activity),
        },
      },
    }));
  },

  setScreen: (patch) =>
    set((s) => ({ config: { ...s.config, screen: { ...s.config.screen, ...patch } } })),

  clampScreenToSafeHeight: () => {
    const { venue, stage, screen } = get().config;
    const maxH = maxLedHeightM(venue.ceilingM, stage.heightM);
    if (maxH != null && screen.heightM > maxH) {
      set((s) => ({
        config: { ...s.config, screen: { ...s.config.screen, heightM: maxH } },
      }));
    }
  },

  setAudio: (patch) =>
    set((s) => ({ config: { ...s.config, audio: { ...s.config.audio, ...patch } } })),

  applyAudioSuggestions: () => {
    const c = get().config;
    set((s) => ({
      config: {
        ...s.config,
        audio: {
          ...s.config.audio,
          speakerCount: recommendSpeakerCount(c),
          subwooferCount: recommendSubwooferCount({
            ...c,
            audio: { ...c.audio, speakerCount: recommendSpeakerCount(c) },
          }),
          useRecommendedBrand: true,
        },
      },
    }));
  },

  setLighting: (patch) =>
    set((s) => ({
      config: { ...s.config, lighting: { ...s.config.lighting, ...patch } },
    })),

  setExtras: (patch) =>
    set((s) => ({ config: { ...s.config, extras: { ...s.config.extras, ...patch } } })),

  setPreviewExpanded: (v) => set({ previewExpanded: v }),

  setWalkMode: (v) => set({ walkMode: v }),
}));
