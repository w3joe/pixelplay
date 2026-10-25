import { autoPlace, autoPlaceMany, suggestedStage } from "@/lib/builder/autoplace";
import { placementsToConfig } from "@/lib/builder/toConfig";
import type { EventSetup, Grid, Placement } from "@/lib/builder/types";
import { recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { maxLedHeightM } from "@/lib/engine/led";
import type { VenuePreset } from "@/lib/types";

/**
 * A ready-to-tweak rig for the event, built by the same auto-placer the "Fix
 * it" buttons use — so a starter kit is just a layout someone already played.
 */
export function starterLayout(grid: Grid, venue: VenuePreset, event: EventSetup): Placement[] {
  const band = event.type === "live_band_dj" || event.type === "outdoor_fow";
  let ps: Placement[] = [];
  const add = (p: Placement | null) => {
    if (p) ps = [...ps, p];
  };

  add(autoPlace(grid, ps, "stage", { settings: suggestedStage(grid, band) }));

  const stageH = ps[0]?.settings.height ?? 0.6;
  const maxH = maxLedHeightM(venue.ceilingM, stageH);
  const ledH = Math.min(grid.cols >= 24 ? 3 : 2, maxH ?? 3);
  add(
    autoPlace(grid, ps, "led", {
      settings: {
        height: ledH,
        screenType: venue.kind === "outdoor_open" ? "outdoor_led" : "indoor_led",
      },
    }),
  );

  const config = placementsToConfig(venue, event, ps);
  const speakers = recommendSpeakerCount(config);
  ps = autoPlaceMany(grid, ps, "speaker", speakers);
  const subs = recommendSubwooferCount({
    ...config,
    audio: { ...config.audio, speakerCount: speakers },
  });
  ps = autoPlaceMany(grid, ps, "sub", subs);

  if (event.type === "speech_ceremony") {
    add(autoPlace(grid, ps, "mic", { settings: { mic: "rostrum" } }));
    add(autoPlace(grid, ps, "mic", { settings: { mic: "handheld" } }));
  } else {
    ps = autoPlaceMany(grid, ps, "mic", 2, { settings: { mic: "handheld" } });
  }

  ps = autoPlaceMany(grid, ps, "par", grid.cols >= 24 ? 4 : 2);

  if (event.type !== "speech_ceremony") {
    add(autoPlace(grid, ps, "truss"));
    ps = autoPlaceMany(grid, ps, "mover", band ? 4 : 3);
  }
  if (band) add(autoPlace(grid, ps, "fog"));
  if (event.type === "wedding") add(autoPlace(grid, ps, "photobooth"));

  return ps;
}
