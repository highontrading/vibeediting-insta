import { fonts } from "./fonts";

/**
 * Art-direction library. Every video picks ONE system and follows it strictly: palette, type,
 * texture and motion language. Rotate systems so consecutive posts never look alike.
 * See docs/DESIGN_SYSTEMS.md for how each one should feel and be used.
 */
export interface DesignSystem {
  id: string;
  name: string;
  /** One line a creative director would say about it. */
  mood: string;
  palette: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    /** Primary accent: use sparingly, it carries the eye. */
    accent: string;
    accent2?: string;
    accent3?: string;
  };
  type: {
    display: string;
    body: string;
    mono?: string;
    displayWeight: number;
    /** letter-spacing for display text, in em */
    displayTracking: number;
    uppercase: boolean;
  };
  motion: {
    /** cubic-bezier control points for the house easing */
    ease: [number, number, number, number];
    /** typical duration of a single move, in frames at 30fps */
    beat: number;
    signature: string;
  };
  texture: "none" | "grain" | "halftone" | "paper" | "scanlines";
}

export const systems = {
  swissSignal: {
    id: "swissSignal",
    name: "Swiss Signal",
    mood: "International Typographic Style: strict grid, one loud red, nothing decorative.",
    palette: { bg: "#F2F0EB", surface: "#E4E1D9", ink: "#111111", muted: "#6B6A66", accent: "#E5321C" },
    type: { display: fonts.interTight, body: fonts.interTight, mono: fonts.jetbrainsMono, displayWeight: 800, displayTracking: -0.045, uppercase: false },
    motion: { ease: [0.16, 1, 0.3, 1], beat: 14, signature: "Hard slides along grid lines, type snapping into columns, cuts on rhythm." },
    texture: "none",
  },
  editorialNoir: {
    id: "editorialNoir",
    name: "Editorial Noir",
    mood: "A print magazine at night: big serif italics, hairline rules, patience.",
    palette: { bg: "#0E0D0B", surface: "#1A1814", ink: "#EDE6D8", muted: "#8C8577", accent: "#C8962E" },
    type: { display: fonts.instrumentSerif, body: fonts.interTight, displayWeight: 400, displayTracking: -0.02, uppercase: false },
    motion: { ease: [0.65, 0, 0.35, 1], beat: 24, signature: "Mask reveals line by line, slow push-ins, hairlines drawing across the frame." },
    texture: "grain",
  },
  risograph: {
    id: "risograph",
    name: "Risograph",
    mood: "Two-colour riso zine: misregistered ink, halftone dots, charming imperfection.",
    palette: { bg: "#F4EDE1", surface: "#EADFCC", ink: "#1F1A17", muted: "#7A6F63", accent: "#FF48B0", accent2: "#0078BF", accent3: "#FFE800" },
    type: { display: fonts.bricolage, body: fonts.bricolage, mono: fonts.spaceMono, displayWeight: 800, displayTracking: -0.03, uppercase: false },
    motion: { ease: [0.34, 1.56, 0.64, 1], beat: 10, signature: "Stepped 12fps motion, colour layers offset 6px, multiply overprint." },
    texture: "halftone",
  },
  brutalBlock: {
    id: "brutalBlock",
    name: "Brutal Block",
    mood: "Neubrutalism: thick black borders, hard offset shadows, unapologetic colour blocks.",
    palette: { bg: "#FFFDF5", surface: "#FFFFFF", ink: "#0A0A0A", muted: "#4A4A4A", accent: "#FF6B35", accent2: "#FFD23F", accent3: "#3A86FF" },
    type: { display: fonts.archivoBlack, body: fonts.spaceGrotesk, mono: fonts.spaceMono, displayWeight: 400, displayTracking: -0.02, uppercase: true },
    motion: { ease: [0.34, 1.7, 0.5, 1], beat: 9, signature: "Cards slam in with overshoot, 12px hard shadows that move with them, sticker pops." },
    texture: "none",
  },
  bauhaus: {
    id: "bauhaus",
    name: "Bauhaus Primary",
    mood: "Circle, square, triangle. Primary colours building compositions like a poster.",
    palette: { bg: "#EFE6D2", surface: "#E3D7BE", ink: "#151515", muted: "#5E574B", accent: "#D7263D", accent2: "#1B4F9C", accent3: "#F2B705" },
    type: { display: fonts.syne, body: fonts.manrope, displayWeight: 800, displayTracking: -0.03, uppercase: true },
    motion: { ease: [0.83, 0, 0.17, 1], beat: 18, signature: "Shapes roll, rotate and lock together; type sits on shape edges." },
    texture: "paper",
  },
  luxeMono: {
    id: "luxeMono",
    name: "Luxe Mono",
    mood: "Fashion-house restraint: black, ivory, champagne; wide tracking, slow and expensive.",
    palette: { bg: "#0A0A0A", surface: "#151413", ink: "#F5F1E8", muted: "#8A857B", accent: "#B8A07E" },
    type: { display: fonts.bodoni, body: fonts.manrope, displayWeight: 400, displayTracking: 0.02, uppercase: true },
    motion: { ease: [0.45, 0, 0.15, 1], beat: 36, signature: "Long fades, letterbox crops, letter-spacing that breathes open, thin gold lines." },
    texture: "grain",
  },
  blueprint: {
    id: "blueprint",
    name: "Blueprint",
    mood: "Technical drawing: everything is drawn, measured and annotated.",
    palette: { bg: "#13315C", surface: "#1B3F73", ink: "#EAF2FB", muted: "#8DA9C4", accent: "#F26419" },
    type: { display: fonts.spaceGrotesk, body: fonts.plexMono, mono: fonts.plexMono, displayWeight: 700, displayTracking: -0.02, uppercase: true },
    motion: { ease: [0.25, 0.1, 0.25, 1], beat: 20, signature: "Strokes draw on (dash offset), dimension arrows, callout labels with leader lines." },
    texture: "none",
  },
  acidSport: {
    id: "acidSport",
    name: "Acid Sport",
    mood: "Sportswear campaign: condensed type at huge scale, acid lime, speed.",
    palette: { bg: "#0B0B0B", surface: "#161616", ink: "#FFFFFF", muted: "#9A9A9A", accent: "#C6FF00" },
    type: { display: fonts.anton, body: fonts.interTight, displayWeight: 400, displayTracking: -0.01, uppercase: true },
    motion: { ease: [0.7, 0, 0.2, 1], beat: 8, signature: "Skewed type smashes, speed lines, cuts on every beat, frame-filling scale." },
    texture: "grain",
  },
  terracotta: {
    id: "terracotta",
    name: "Terracotta Calm",
    mood: "Warm, organic, human: clay, olive, sand; soft shapes that breathe.",
    palette: { bg: "#E9DCC9", surface: "#DDCBB3", ink: "#3D2C29", muted: "#7D6B5D", accent: "#C65D3B", accent2: "#6B705C" },
    type: { display: fonts.fraunces, body: fonts.manrope, displayWeight: 600, displayTracking: -0.025, uppercase: false },
    motion: { ease: [0.37, 0, 0.63, 1], beat: 28, signature: "Blob morphs, gentle floating, things grow like plants." },
    texture: "paper",
  },
  newsprint: {
    id: "newsprint",
    name: "Newsprint",
    mood: "Breaking-news collage: newspaper columns, marker highlights, cut-out paper.",
    palette: { bg: "#E8E6DF", surface: "#D9D6CC", ink: "#141414", muted: "#5C5A55", accent: "#FFE94D", accent2: "#D62828" },
    type: { display: fonts.dmSerif, body: fonts.plexMono, mono: fonts.plexMono, displayWeight: 400, displayTracking: -0.02, uppercase: false },
    motion: { ease: [0.2, 0.8, 0.2, 1], beat: 12, signature: "Highlighter swipes, typewriter text, torn-paper cut-outs sliding in." },
    texture: "paper",
  },
  nightTransit: {
    id: "nightTransit",
    name: "Night Transit",
    mood: "City at 2am: wayfinding signage, sodium-orange light, split-flap boards.",
    palette: { bg: "#0D1B2A", surface: "#14273C", ink: "#F4F1EA", muted: "#7E8C9A", accent: "#FF9F1C" },
    type: { display: fonts.bigShoulders, body: fonts.interTight, mono: fonts.jetbrainsMono, displayWeight: 900, displayTracking: 0.01, uppercase: true },
    motion: { ease: [0.5, 0, 0.1, 1], beat: 15, signature: "Split-flap character flips, arrows sweeping, signage panels sliding on rails." },
    texture: "grain",
  },
  pastelLab: {
    id: "pastelLab",
    name: "Pastel Lab",
    mood: "Soft product-launch energy: pastel pills, chunky rounded type, bouncy physics.",
    palette: { bg: "#F7F3EE", surface: "#FFFFFF", ink: "#2B2B2B", muted: "#8A8580", accent: "#FF8FAB", accent2: "#9BC5FF", accent3: "#B9F3B0" },
    type: { display: fonts.unbounded, body: fonts.manrope, displayWeight: 800, displayTracking: -0.03, uppercase: false },
    motion: { ease: [0.34, 1.56, 0.64, 1], beat: 12, signature: "Pills squash and stretch, elements bounce in with soft shadows, playful stagger." },
    texture: "none",
  },
} satisfies Record<string, DesignSystem>;

export type SystemId = keyof typeof systems;
