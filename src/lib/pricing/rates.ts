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
  parWash: { low: 400, high: 1000 },
  movingHeadsTruss: { low: 800, high: 2500 },
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
  parPackage: 800,
  movingHeadsPackage: 2000,
  projector: 400,
} as const;

export const POWER_CAPACITY_W: Record<string, number> = {
  light: 3000,
  medium: 8000,
  heavy: 20000,
  generator: 15000,
};
