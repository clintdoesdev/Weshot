/** Built-in backgrounds, UI spec §2.8. Order matters: the first one is the default. */

export type GradientStop = { offset: number; color: string };

export type BackgroundLayer =
  | { type: 'solid'; color: string }
  /** CSS linear-gradient semantics: angle in degrees, 0 = to top, 90 = to right. */
  | { type: 'linear'; angle: number; stops: GradientStop[] }
  /** CSS `radial-gradient(circle at cx cy, ...)` with farthest-corner sizing; offsets are fractions of that radius. */
  | { type: 'radial-circle'; cx: number; cy: number; stops: GradientStop[] };

export type BuiltInBackground = {
  id: BackgroundId;
  name: string;
  css: string;
  /** Painted bottom to top. */
  layers: BackgroundLayer[];
  /** Whether the background reads as light (used to pick swatch contrast, not frame colors). */
  light: boolean;
};

export const BACKGROUND_IDS = ['honey', 'midnight', 'lemon', 'graphite', 'black', 'paper'] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

export const BUILT_IN_BACKGROUNDS: readonly BuiltInBackground[] = [
  {
    id: 'honey',
    name: 'Honey',
    css: 'linear-gradient(160deg, #FFE45C 0%, #FFB800 100%)',
    layers: [
      {
        type: 'linear',
        angle: 160,
        stops: [
          { offset: 0, color: '#FFE45C' },
          { offset: 1, color: '#FFB800' },
        ],
      },
    ],
    light: true,
  },
  {
    id: 'midnight',
    name: 'Midnight glow',
    css: 'radial-gradient(circle at 30% 20%, rgba(255,214,10,0.55), rgba(0,0,0,0) 55%), #0A0A0A',
    layers: [
      { type: 'solid', color: '#0A0A0A' },
      {
        type: 'radial-circle',
        cx: 0.3,
        cy: 0.2,
        stops: [
          { offset: 0, color: 'rgba(255,214,10,0.55)' },
          { offset: 0.55, color: 'rgba(0,0,0,0)' },
        ],
      },
    ],
    light: false,
  },
  { id: 'lemon', name: 'Lemon', css: '#FFF6CC', layers: [{ type: 'solid', color: '#FFF6CC' }], light: true },
  {
    id: 'graphite',
    name: 'Graphite',
    css: 'linear-gradient(180deg, #6A6A70 0%, #2B2B2F 100%)',
    layers: [
      {
        type: 'linear',
        angle: 180,
        stops: [
          { offset: 0, color: '#6A6A70' },
          { offset: 1, color: '#2B2B2F' },
        ],
      },
    ],
    light: false,
  },
  { id: 'black', name: 'Black', css: '#000000', layers: [{ type: 'solid', color: '#000000' }], light: false },
  { id: 'paper', name: 'Paper', css: '#F2F0EB', layers: [{ type: 'solid', color: '#F2F0EB' }], light: true },
];

export function getBackground(id: BackgroundId): BuiltInBackground {
  const bg = BUILT_IN_BACKGROUNDS.find((b) => b.id === id);
  if (!bg) throw new Error(`Unknown background ${id}`);
  return bg;
}
