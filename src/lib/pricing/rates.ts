/** Indicative Singapore market ballpark rates (SGD / day). Non-binding. */

export const RATES = {
  indoorLedPerSqm: { low: 180, high: 350 },
  outdoorLedMultiplier: { low: 1.3, high: 1.5 },
  engineerEndorsement: { low: 500, high: 800 },
  projectorPackage: { low: 300, high: 800 },
  paBySpeakerCount: {
    2: { low: 350, high: 800 },
    4: { low: 700, high: 1500 },
    8: { low: 1500, high: 3000 },
  } as Record<number, { low: number; high: number }>,
  paPerExtraPair: { low: 350, high: 700 },
  subwooferEach: { low: 150, high: 350 },
  stagePerSqm: { low: 80, high: 120 },
  stagePackageClamp: { low: 400, high: 1500 },
  // Per-fixture, calibrated so the default rig (2 PAR, 3 movers) reproduces
  // the flat package prices these replaced: 400–1000 and 800–2500.
  parEach: { low: 200, high: 500 },
  movingHeadEach: { low: 180, high: 550 },
  /** Truss and rigging, charged once regardless of how many movers hang on it. */
  movingHeadTrussBase: { low: 260, high: 850 },
  fogMachine: { low: 150, high: 350 },
  photobooth: { low: 600, high: 1200 },
  micExtraEach: { low: 40, high: 80 },
} as const;

export const PRICE_DISCLAIMER =
  "Indicative estimate — non-binding. Final quotation depends on dates, crew, logistics, venue constraints, and site survey.";

/** Approximate watt draws for power sufficiency (planning only). */
export const POWER_DRAW_W = {
  indoorLedPerSqm: 400,
  outdoorLedPerSqm: 700,
  speakerEach: 650,
  subEach: 1000,
  parEach: 400,
  movingHeadEach: 650,
  fogMachine: 1200,
  projector: 400,
} as const;

export const POWER_CAPACITY_W: Record<string, number> = {
  light: 3000,
  medium: 8000,
  heavy: 20000,
  generator: 15000,
};
