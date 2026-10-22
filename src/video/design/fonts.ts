// Real typefaces, bundled from @fontsource so renders never depend on a font CDN.
// Top-level delayRender makes every frame wait until all of them are loaded.
import { continueRender, delayRender } from "remotion";

import "@fontsource/inter-tight/300";
import "@fontsource/inter-tight/400";
import "@fontsource/inter-tight/600";
import "@fontsource/inter-tight/800";
import "@fontsource/inter-tight/900";
import "@fontsource/instrument-serif/400";
import "@fontsource/instrument-serif/400-italic";
import "@fontsource/fraunces/300";
import "@fontsource/fraunces/600";
import "@fontsource/fraunces/900";
import "@fontsource/fraunces/300-italic";
import "@fontsource/space-grotesk/400";
import "@fontsource/space-grotesk/700";
import "@fontsource/jetbrains-mono/400";
import "@fontsource/jetbrains-mono/700";
import "@fontsource/archivo-black/400";
import "@fontsource/syne/500";
import "@fontsource/syne/800";
import "@fontsource/dm-serif-display/400";
import "@fontsource/dm-serif-display/400-italic";
import "@fontsource/ibm-plex-mono/400";
import "@fontsource/ibm-plex-mono/600";
import "@fontsource/unbounded/400";
import "@fontsource/unbounded/800";
import "@fontsource/bricolage-grotesque/400";
import "@fontsource/bricolage-grotesque/800";
import "@fontsource/bodoni-moda/400";
import "@fontsource/bodoni-moda/400-italic";
import "@fontsource/bodoni-moda/700";
import "@fontsource/anton/400";
import "@fontsource/big-shoulders-display/500";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/manrope/300";
import "@fontsource/manrope/500";
import "@fontsource/manrope/800";
import "@fontsource/space-mono/400";
import "@fontsource/space-mono/700";

export const fonts = {
  interTight: "'Inter Tight', sans-serif",
  instrumentSerif: "'Instrument Serif', serif",
  fraunces: "'Fraunces', serif",
  spaceGrotesk: "'Space Grotesk', sans-serif",
  jetbrainsMono: "'JetBrains Mono', monospace",
  archivoBlack: "'Archivo Black', sans-serif",
  syne: "'Syne', sans-serif",
  dmSerif: "'DM Serif Display', serif",
  plexMono: "'IBM Plex Mono', monospace",
  unbounded: "'Unbounded', sans-serif",
  bricolage: "'Bricolage Grotesque', sans-serif",
  bodoni: "'Bodoni Moda', serif",
  anton: "'Anton', sans-serif",
  bigShoulders: "'Big Shoulders Display', sans-serif",
  manrope: "'Manrope', sans-serif",
  spaceMono: "'Space Mono', monospace",
} as const;

// Every family/weight/style imported above. Keep in sync when adding imports.
const FACES: [family: string, weight: number, style?: "italic"][] = [
  ["Inter Tight", 300], ["Inter Tight", 400], ["Inter Tight", 600], ["Inter Tight", 800], ["Inter Tight", 900],
  ["Instrument Serif", 400], ["Instrument Serif", 400, "italic"],
  ["Fraunces", 300], ["Fraunces", 600], ["Fraunces", 900], ["Fraunces", 300, "italic"],
  ["Space Grotesk", 400], ["Space Grotesk", 700],
  ["JetBrains Mono", 400], ["JetBrains Mono", 700],
  ["Archivo Black", 400],
  ["Syne", 500], ["Syne", 800],
  ["DM Serif Display", 400], ["DM Serif Display", 400, "italic"],
  ["IBM Plex Mono", 400], ["IBM Plex Mono", 600],
  ["Unbounded", 400], ["Unbounded", 800],
  ["Bricolage Grotesque", 400], ["Bricolage Grotesque", 800],
  ["Bodoni Moda", 400], ["Bodoni Moda", 400, "italic"], ["Bodoni Moda", 700],
  ["Anton", 400],
  ["Big Shoulders Display", 500], ["Big Shoulders Display", 900],
  ["Manrope", 300], ["Manrope", 500], ["Manrope", 800],
  ["Space Mono", 400], ["Space Mono", 700],
];

if (typeof document !== "undefined") {
  const handle = delayRender("Loading fonts");
  Promise.all(FACES.map(([family, weight, style]) => document.fonts.load(`${style ?? "normal"} ${weight} 48px "${family}"`)))
    .catch((err) => console.error("Font load failed", err))
    .finally(() => continueRender(handle));
}
