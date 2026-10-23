# WeShot — UI Spec

Version 1.0 · October 2026 · Companion to `WESHOT_PRODUCT_SPEC.md`

**Look:** black and yellow, Apple-style glass. A pure black page with a soft yellow light glowing behind frosted, translucent panels. Yellow marks every primary action and selected state, and nothing else. Type is Givonic.

**Hard rules**
- No emoji anywhere in UI or copy. Icons are one consistent stroke SVG set (Lucide, 1.75 stroke).
- No eyebrow badge pills (pill chips with a pulsing dot and uppercase letter-spaced text). No all-caps labels.
- No sign-in, pricing, plans, credits or watermark UI anywhere.
- Sentence case everywhere. Buttons say what happens: "Frame it", "Download PNG", "Copy image", "Share link".

---

## 1. Design tokens

### 1.1 Color

```css
:root {
  /* ground */
  --ws-black: #000000;
  --ws-ink-900: #0A0A0A;           /* deepest panel fills, code blocks */
  --ws-chrome-dark: rgba(28, 28, 30, 0.88);   /* dark window title bar */
  --ws-chrome-light: rgba(245, 245, 247, 0.88);

  /* accent */
  --ws-yellow: #FFD60A;            /* primary actions, selected state, toggles, slider fill */
  --ws-yellow-soft: rgba(255, 214, 10, 0.14);  /* selected option fill */
  --ws-yellow-line: rgba(255, 214, 10, 0.70);  /* selected option border */
  --ws-on-yellow: #000000;         /* text/icons on yellow */

  /* text */
  --ws-text: #FFFFFF;
  --ws-text-2: rgba(255, 255, 255, 0.72);    /* body copy, descriptions */
  --ws-text-3: rgba(255, 255, 255, 0.65);    /* labels, captions (min contrast 7:1 on black) */
  --ws-placeholder: rgba(255, 255, 255, 0.55);

  /* glass */
  --ws-glass-1: rgba(255, 255, 255, 0.05);   /* cards, large panels */
  --ws-glass-2: rgba(255, 255, 255, 0.07);   /* nav */
  --ws-glass-3: rgba(255, 255, 255, 0.10);   /* paste bar, inputs */
  --ws-glass-btn: rgba(255, 255, 255, 0.08); /* secondary buttons */
  --ws-glass-on: rgba(255, 255, 255, 0.16);  /* selected segment (non-primary) */
  --ws-well: rgba(0, 0, 0, 0.35);            /* segmented-control track, preview well */
  --ws-line-1: rgba(255, 255, 255, 0.12);
  --ws-line-2: rgba(255, 255, 255, 0.16);
  --ws-line-3: rgba(255, 255, 255, 0.22);    /* paste bar border */
  --ws-highlight: rgba(255, 255, 255, 0.22); /* inset top highlight */

  /* status */
  --ws-rec: #FF453A;               /* recording dot only */

  /* macOS traffic lights (frame content, not UI chrome) */
  --ws-tl-red: #FF5F57;
  --ws-tl-yellow: #FEBC2E;
  --ws-tl-green: #28C840;
}
```

Fallback when `backdrop-filter` is unsupported: raise glass fills to `rgba(28,28,30,0.92)` so text stays readable.

### 1.2 Glass recipes

| Recipe | Background | Blur | Border | Shadow |
| --- | --- | --- | --- | --- |
| `glass-nav` | `--ws-glass-2` | `blur(28px) saturate(170%)` | 1px `--ws-line-1` (0.14) | `inset 0 1px 0 var(--ws-highlight), 0 12px 40px rgba(0,0,0,0.4)` |
| `glass-bar` (paste bar) | `--ws-glass-3` | `blur(30px) saturate(180%)` | 1px `--ws-line-3` | `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.45)` |
| `glass-panel` (editor shell) | `--ws-glass-1` | `blur(36px) saturate(170%)` | 1px `--ws-line-1` (0.14) | `inset 0 1px 0 rgba(255,255,255,0.2), 0 40px 100px rgba(0,0,0,0.55)` |
| `glass-tile` (control tiles, cards) | `rgba(255,255,255,0.06)` | inherits panel | 1px `--ws-line-1` | `inset 0 1px 0 rgba(255,255,255,0.14)` |
| `glass-sheet` (mobile sheets) | `rgba(28,28,30,0.55–0.62)` | `blur(40–44px) saturate(180%)` | 1px `rgba(255,255,255,0.16–0.18)`, no bottom border | `inset 0 1px 0 rgba(255,255,255,0.22–0.25)` |
| `glass-pill-status` | `rgba(0,0,0,0.6)` | `blur(24px) saturate(170%)` | 1px `rgba(255,255,255,0.18)` | inset highlight 0.2 |

Primary yellow buttons get `box-shadow: inset 0 1px 0 rgba(255,255,255,0.6)` for the glass sheen.

### 1.3 Ambient glow

The glass only reads as glass if something sits behind it. Every screen has 1–2 absolutely positioned glow layers, `aria-hidden`, behind content:

```css
.ws-glow {
  position: absolute; pointer-events: none;
  background: radial-gradient(closest-side, rgba(255,214,10,0.55), rgba(255,214,10,0.12) 60%, rgba(255,214,10,0));
  filter: blur(30px);
}
```

- Desktop landing: 1100×760 centered at top 260 px (behind paste bar + editor); a second 700×700 at 0.28 opacity, left, around the recordings section.
- Mobile: 520–640 px circle behind the hero/preview; a second at 0.28 lower down.
- Static. No animation (respect `prefers-reduced-motion` regardless).

### 1.4 Typography

```css
font-family: 'Givonic', 'Outfit', system-ui, sans-serif;   /* UI and headings */
font-family: 'Geist Mono', ui-monospace, monospace;         /* numeric values only: 1440 × 900, 52 px, 12 s, 72% */
```

- Givonic (Letterhend) is a paid font. Self-host the licensed WOFF2 via `next/font/local` (weights 400, 500, 600). Until the licence is bought, Outfit (Google Fonts) carries the design.
- The captured website inside the frame keeps its own fonts; the fake demo page uses `system-ui`.

| Role | Desktop | Mobile | Weight | Tracking | Line height |
| --- | --- | --- | --- | --- | --- |
| H1 hero | 76 px | 44 px | 600 | -0.04em | 1.0 |
| H2 section | 44 px | 30 px | 600 | -0.035em | 1.1 |
| Card title | 22 px | 18 px | 600 | -0.01em | 1.25 |
| Body large | 20 px (hero sub), 18 px | 17 px / 16 px | 400 | 0 | 1.5 |
| Body | 16 px | 15 px | 400 | 0 | 1.5 |
| UI label / control | 14–15 px | 14–15 px | 400–500 | 0 | 1.3 |
| Tile title | 16 px | — | 600 | 0 | 1.3 |
| Caption | 13–14 px | 13–14 px | 400 | 0 | 1.4 |

### 1.5 Radius, spacing, sizing

| Token | Value | Used on |
| --- | --- | --- |
| `r-pill` | 999px | nav, paste bar, tabs, chips, primary/secondary pill buttons |
| `r-shell` | 32px | editor shell (desktop), mobile sheets top corners 30–32px |
| `r-panel` | 28px | preview well, record aside, recording preview |
| `r-card` | 22–26px | control tiles, gallery cards, step cards, FAQ rows (20px) |
| `r-control` | 12–18px | segmented tracks (12), option buttons (12–14), large buttons (14–18) |
| `r-swatch` | 12px | background swatches |
| Spacing scale | 4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 88, 112 | |
| Container | max 1280px (editor, sections), 1120px (nav, hero), 860px (FAQ); side padding 32px desktop, 16–20px mobile | |
| Touch targets | ≥ 44×44 px everywhere; primary mobile buttons 52–56 px tall | |

### 1.6 Motion

- One orchestrated moment: after **Frame it**, the page smooth-scrolls to the editor (400 ms, ease-out) and the preview window fades/scales in from 0.98 (240 ms).
- Control feedback: 120–160 ms color/opacity transitions on press and selection. No hover lift effects on cards.
- Sheets (mobile): slide up 280 ms `cubic-bezier(0.32, 0.72, 0, 1)`.
- `prefers-reduced-motion: reduce` → no scroll animation, no scale; instant swaps.

## 2. Components

### 2.1 Logo
30×30 yellow rounded square (radius 9) with a black window glyph (rect + title-bar line), then "WeShot" in 19px/600 white. Mobile: 28px mark, 17px text.

### 2.2 Nav (desktop)
`glass-nav` pill, max-width 1120, margin-top 20, padding `10px 10px 10px 20px`. Left: logo. Right: links Examples, Recordings, FAQ (15px, `--ws-text-2` at 0.78, padding 10×14, pill hover fill `--ws-glass-btn`). Nothing else: no sign-in, no CTA.

Mobile: same pill at 16px side margin; logo left, round 44px menu button right (opens a glass sheet with the 3 links).

### 2.3 Paste bar (the hero control)
`glass-bar`, pill, max-width 760 (desktop) / full width minus 32 (mobile), padding `8px 8px 8px 22px`.

Contents, left → right: link icon 22px (`--ws-text-2`) · text input (18px desktop / 16px mobile, placeholder "Paste a link or an image") · image button (48px circle, `--ws-glass-btn`, 1px `--ws-line-2`, image icon, `aria-label="Upload an image"`; hidden on mobile, where the input tap offers the photo picker via a separate "Pick a screenshot" text link under the bar) · **Frame it** (yellow pill, 56px tall desktop / 46px mobile, 17px/600 black).

Behavior:
- Enter submits. Paste of an image anywhere on the page (document-level `paste` listener) or a drop anywhere (full-page drop overlay: dashed 2px yellow border inset 16px, glass fill, text "Drop to frame it") loads the image.
- Pasting text that looks like a URL fills the bar and auto-submits.
- Invalid input: bar border turns `--ws-yellow-line`, helper text under the bar shows the error copy (product spec §6). Never red.

Under the bar: caption 14px `--ws-text-3`: "Free, no account. Drop a screenshot anywhere on the page to frame it."

### 2.4 Segmented control
Track: `--ws-well`, 1px `rgba(255,255,255,0.10)`, radius pill (tabs) or 12 (in tiles), padding 3–4.
- **Primary segmented (editor tabs, mobile Image/Video):** selected = yellow fill, black text 600. Unselected = transparent, `rgba(255,255,255,0.78)`.
- **Secondary segmented (1x/2x/3x, Dark/Light glass, shadow, fps, format):** selected = `--ws-glass-on` white text. Unselected = transparent, 0.7 white.
- Use `role="tablist"`/`tab` for editor tabs; `aria-pressed` buttons for value pickers.

### 2.5 Option button (choice cards)
Height 48, radius 12–14, 13–14px. Selected: `--ws-yellow-soft` fill, 1px `--ws-yellow-line`, white text. Unselected: `rgba(0,0,0,0.25)` or `--ws-glass-1` fill, 1px `rgba(255,255,255,0.14)`, 0.75 white text. Larger variant (Recording type): padding 14×16, radius 18, title 15/600 + description 13px `--ws-text-3`.

### 2.6 Toggle
40×24 pill. Off: `--ws-glass-on` track, white 18px knob left. On: yellow track, **black** knob right. Real `<input type="checkbox" role="switch">` under the visual.

### 2.7 Slider
Track 4px, `rgba(255,255,255,0.18)`; fill yellow; thumb 18px white circle with `0 2px 6px rgba(0,0,0,0.4)`. Value shown right-aligned in Geist Mono. Native `<input type="range">` styled.

### 2.8 Background swatch
44px tall, radius 12, 1px `rgba(255,255,255,0.18)`. Selected: 2px yellow outline, 2px offset. `aria-label="Use {name} background"`, `aria-pressed`.

Built-in backgrounds (order matters; first is default):

| Id | Name | CSS |
| --- | --- | --- |
| `honey` | Honey (default) | `linear-gradient(160deg, #FFE45C 0%, #FFB800 100%)` |
| `midnight` | Midnight glow | `radial-gradient(circle at 30% 20%, rgba(255,214,10,0.55), rgba(0,0,0,0) 55%), #0A0A0A` |
| `lemon` | Lemon | `#FFF6CC` |
| `graphite` | Graphite | `linear-gradient(180deg, #6A6A70 0%, #2B2B2F 100%)` |
| `black` | Black | `#000000` |
| `paper` | Paper | `#F2F0EB` |

### 2.9 Chip (presets, format)
Height 36, pill, 14px. Default: `--ws-glass-1`(0.06) fill, 1px `--ws-line-2`. Selected preset: `--ws-yellow-soft` + `--ws-yellow-line`. Selected format chip in Export tile: solid yellow, black 600 text.

### 2.10 Buttons
| Variant | Spec |
| --- | --- |
| Primary | Yellow fill, black text 600, inset sheen; pill (48–56 px) or radius 14–18 (mobile full-width, 52–56 px) |
| Secondary | `--ws-glass-btn` fill, 1px `--ws-line-2`, white text; radius 14–16 or pill |
| Icon | 44–54 px square/circle, secondary styling, `aria-label` required |
| Disabled | Primary: `rgba(255,214,10,0.35)` fill, 0.85 white text; never rely on color alone, also change the label ("Recording in progress") |

### 2.11 Window frame (inside the preview, drawn by the compositor)
- Title bar 42px (desktop preview scale), chrome `--ws-chrome-dark` or `--ws-chrome-light` with backdrop blur 20px.
- Traffic lights 12px, 8px gap, 14px from left.
- URL pill centered: `rgba(255,255,255,0.12)` (dark) / `rgba(0,0,0,0.07)` (light), text `#E5E5EA` / `#3A3A3C`, 12px, padding 5×16.
- Window radius 14 (setting), border 1px `rgba(255,255,255,0.14)` dark / `rgba(0,0,0,0.10)` light.
- Shadow Soft: `0 30px 70px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.3)`. Deep: `0 50px 120px rgba(0,0,0,0.6), 0 12px 30px rgba(0,0,0,0.4)`.

### 2.12 Status pill (recording, capturing)
`glass-pill-status`, centered at bottom of preview, 22px from bottom. Contents: 10px dot (`--ws-rec` for recording, yellow pulsing for capturing) · label · 180px progress bar (yellow fill) · mono time "7.2 s / 12 s" · secondary **Stop** button 34px. `role="status"`, `aria-live="polite"`.

## 3. Screens

### 3.1 Desktop landing page (≥ 1024 px)

Single scrolling page, black background, glow layers behind.

1. **Nav** (2.2).
2. **Hero** — centered, padding-top 88. H1 "Your website, beautifully framed." (max-width 900). Sub (20px, `--ws-text-2`, max 620): "Paste a link or an image. WeShot wraps it in a macOS window on the background you pick, ready to download as an image or a scroll video." Paste bar (2.3) 40px below. Caption 14px under it.
3. **Editor** (`id="editor"`) — padding `56px 32px 112px`, `glass-panel` shell radius 32, padding 14, gap 12.
   - **Toolbar row** (wraps): left = editor tabs (primary segmented): Capture · Frame · Background · Layout · Record · Export. Right = device switcher (secondary segmented, 3 icon buttons 44×40: Desktop/Tablet/Mobile) + **Download** primary pill (48px, download icon).
   - **Body row** (flex-wrap, gap 12):
     - **Preview well** (`flex: 999 1 560px`): radius 22, `--ws-well`, padding 10. Inside: the preview stage (radius 16, background = current background, padding = padding setting, min-height 520, window centered, max-width 640). Under the stage: presets chips row (label "Presets", Launch post / Portfolio / Minimal, plus "Save current" dashed chip) left; zoom group right (Fit button, zoom slider 120px, mono "72%").
     - **Control tiles** (`flex: 1 1 460px`): 2-column grid, gap 12, six `glass-tile`s radius 22 padding 18:
       - **Capture**: Viewport (mono value) · scale segmented 1x/2x/3x · Full page toggle · Hide cookie banners toggle (on).
       - **Window**: 3 option buttons macOS/Safari/None · secondary segmented Dark glass / Light glass · Title bar row (value "URL pill", opens a menu).
       - **Background**: 3×2 swatch grid · Blur slider · Grain slider · (overflow menu: custom color, gradient, upload image, transparent).
       - **Layout**: Padding (mono "52 px") · Corner radius ("14 px") · shadow segmented No shadow/Soft/Deep · Canvas row ("X post, 1600 × 900", opens size menu).
       - **Record**: description "Scroll the page top to bottom inside the frame." · Length (mono "12 s") · secondary button with record icon "Record scroll video".
       - **Export**: format chips PNG (selected, yellow) / JPG / WebP / MP4 / GIF · Copy + Share link secondary buttons.
     - **Tab behavior on desktop:** all six tiles stay visible; clicking a tab highlights its tile (border becomes yellow) and scrolls it into view if needed. The selected tab is yellow.
4. **Gallery** (`id="gallery"`) — H2 "Start from a look you like", sub "Each example is a preset. Click one to load it into the editor with your own link." 4-up auto-fit grid (min 280). Card: `glass-tile` radius 24 padding 10; image area 210px radius 16 showing a framed window on a background; caption 15px. Examples: Honey + dark glass · Midnight glow + light glass · Graphite + cropped corner (window bleeds off bottom-right) · Lemon + desktop and phone.
5. **Three steps** — H2 "From link to post in three steps". 3 cards radius 26 padding 28: yellow 36px numbered circle (black number), title 22/600, body 16px `--ws-text-2`: "Paste a link or an image" / "Style the frame" / "Download or share".
6. **Recordings** (`id="recordings"`) — two columns: left H2 "Scroll videos without screen recording", body, 3 check items (yellow check icons): "5 to 60 seconds, 30 or 60 fps" · "Animated cursor with click ripples" · "Section tour: glide between the parts you pick". Right: Honey background card radius 28 padding 44 with a framed window and a glass play button (68px, black 0.55 glass, yellow play icon), black progress line at the bottom of the page area.
7. **FAQ** (`id="faq"`, max 860) — H2 "Questions". `<details>` rows: radius 20, padding 20×24, `--ws-glass-1`, 1px `--ws-line-1`. Questions: "Can I frame a page behind a login?" · "Why did my capture fail?" · "Do I need an account?" · "Is it really free?" (answers in §5).
8. **Footer** — top border `rgba(255,255,255,0.10)`, "© 2026 Nova Pixel Studios" left; Terms, Privacy, X right (15px `--ws-text-3`).

### 3.2 Desktop editor — recording in progress

Same page, scrolled to the editor; the editor can also be reached directly at `/#editor`.
- Top row: logo · URL row (glass-bar style, 52px: link icon, URL, secondary **Re-capture** pill) · mono capture summary "Desktop, 1440 × 900, 2x".
- Left: preview panel (radius 28) with Honey stage, window showing the page mid-scroll, animated cursor with a soft ripple ring, status pill (2.12) "Recording · 7.2 s / 12 s · Stop".
- Right aside (max 420, radius 28): tabs as a 3×2 grid (Record selected, yellow) · Recording type cards (Scroll-through selected / Section tour) · Length slider (12 s) · Scroll easing ("Ease in and out", menu) · Pause at headings toggle (on) · Animated cursor toggle (on) · Frame rate 30/60 fps · Format MP4/WebM/GIF · bottom: disabled primary "Recording in progress" + caption "You can keep styling while it records."

### 3.3 Mobile landing (< 768 px, designed at 390)
Order: nav pill → centered H1 (44px) and sub → paste bar with **Frame it** → caption "Free, no account. Or tap to pick a screenshot." → demo preview card (radius 26, Honey stage 230px with framed window) → gallery as horizontal scroll (240px cards) → three steps (stacked cards, number circle left) → recordings (text then video card) → FAQ (3 rows: account, login pages, free) → footer stacked.

Tapping **Frame it** or a gallery card opens the mobile editor.

### 3.4 Mobile editor (390×844)
- Header 56px: logo only.
- Paste bar row (padding 0 16 12): input + **Frame it**.
- Preview stage: 16px side margin, 290px tall, radius 22, 1px `--ws-line-1`; pinch to zoom.
- Presets chips row, horizontal scroll.
- **Bottom sheet** (`glass-sheet`, radius 30 top, fills remaining height): grabber 40×5 · primary segmented tabs (scrolls horizontally: Capture, Frame, Background, Layout, Record, Export) · tab content (only the selected tab's controls, same controls as desktop tiles) · sticky footer: Copy icon button 54px + **Download** primary (flex 1, 54px) which opens the download sheet.
- Default tab: Background. Swatches render as a 6-column row.

### 3.5 Mobile download sheet
Overlay dims the editor with `rgba(0,0,0,0.35)`. Sheet height ~620, `glass-sheet` 0.62, radius 32.
- Header: "Download" 22/600 + 44px round close button.
- Image / Video primary segmented (full width).
- Format: 3 option buttons PNG / JPG / WebP (Video: MP4 / WebM / GIF).
- Size: radio list rows 50px radius 16 — X post 1600 × 900 (selected, yellow-soft) · LinkedIn 1200 × 627 · Instagram 1080 × 1350 · Product Hunt 1270 × 760; sizes in Geist Mono 13px; native radio with `accent-color: #FFD60A`.
- Footer: **Download PNG** primary 56px; Copy image + Share link secondary row (48px).

## 4. States

| State | Where | Treatment |
| --- | --- | --- |
| First visit / empty | Editor | Preview shows the demo page framed with Launch post so it never looks blank; tiles are live |
| Capturing | Preview | Skeleton window (glass shimmer at 0.06–0.10, 1.2 s loop, disabled under reduced motion) + status pill with step text: "Loading page" → "Waiting for fonts" → "Framing" |
| Captured | Preview | Fade-in 240 ms |
| Capture settings changed | URL row | **Re-capture** secondary pill appears with a yellow 6px dot |
| Error | Under paste bar + preview | Message from product spec §6, action buttons ("Retry", "Paste a screenshot instead"); border yellow-line; no red |
| Image mode | Capture + Record tiles | Controls disabled at 40% opacity, tooltip "Available for links" |
| Recording | Preview + Record tile | Status pill, disabled primary "Recording in progress" |
| Recording done | Export tile / sheet | Switches to Video with format preselected; toast "Video ready" with **Download MP4** |
| Copied | Toast | "Image copied" (glass toast, bottom center, 2 s) |
| Share created | Dialog | Glass dialog with the URL in a read-only input, **Copy link** primary, "Expires in 30 days" caption, **Delete** text button |
| Rate limited | Under bar | "You've made a lot of captures this hour. Try again in {minutes} min." |
| Drop target | Whole page | Full-page overlay, dashed yellow inset border, "Drop to frame it" |
| No backdrop-filter support | Global | Solid `rgba(28,28,30,0.92)` panels |

## 5. Copy deck

- **Hero H1:** Your website, beautifully framed.
- **Hero sub:** Paste a link or an image. WeShot wraps it in a macOS window on the background you pick, ready to download as an image or a scroll video.
- **Bar placeholder:** Paste a link or an image
- **Bar button:** Frame it
- **Under bar:** Free, no account. Drop a screenshot anywhere on the page to frame it.
- **FAQ**
  - Can I frame a page behind a login? — Take the screenshot yourself and paste it into the bar. The frame and background work the same way.
  - Why did my capture fail? — Some sites block automated browsers. WeShot says which check stopped it and suggests pasting a screenshot instead.
  - Do I need an account? — No. Paste, style, download. Your presets are saved in your browser.
  - Is it really free? — Yes. Captures, recordings and downloads are all free to use.
- **Footer:** © 2026 Nova Pixel Studios · Terms · Privacy · X

## 6. Keyboard shortcuts (desktop)

| Keys | Action |
| --- | --- |
| Cmd/Ctrl + V (anywhere) | Paste a link or image |
| Enter (in bar) | Frame it |
| Cmd/Ctrl + C (focus not in a field) | Copy image |
| Cmd/Ctrl + S | Download with current settings |
| R | Re-capture |
| 1–6 | Switch editor tab |
| Shift + / | Shortcuts dialog |

Register shortcuts on the editor region, not as unconditional global handlers, and ignore them while an input has focus.

## 7. Responsive behavior

| Breakpoint | Layout |
| --- | --- |
| ≥ 1280 | As specified; preview and 2-col tiles side by side |
| 1024–1279 | Same, tiles column min 460 so it may wrap under the preview |
| 768–1023 | Preview full width; tiles 2-col grid under it; tabs wrap |
| < 768 | Mobile layouts (3.3–3.5); editor uses the bottom sheet |

## 8. Accessibility checklist

- All controls are real `<button>`, `<input>`, `<label>`, `<details>`; no click handlers on divs.
- Icon-only buttons have `aria-label`. Decorative SVGs and glow layers are `aria-hidden="true"`.
- Focus ring: 2px solid yellow, 3px offset, on every interactive element.
- Text contrast: white on black 21:1; `--ws-text-3` (0.65) ≥ 7:1 on black; black on yellow 14:1. On glass over the yellow glow, never drop below 0.65 white for text.
- Status changes announced via `role="status"`.
- Preview has `role="img"` with `aria-label` describing the current frame ("Framed screenshot of queuely.app on Honey background").

## 9. Reference

Visual reference canvas (private to the owner): https://claude.ai/artifact/9fYgNNy67VUcioxxu6kmGK — desktop landing + editor, desktop recording, mobile editor, mobile download sheet, mobile landing, and grayscale wireframes. This spec wins over the canvas wherever they differ.
