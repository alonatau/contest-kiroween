# Design: Ghostagotchi polish pass

Goal (from `requirements.md`): make the first 30 seconds clear and
delightable for a first-time judge, without changing the core loop. All
changes are plain HTML/CSS/vanilla JS in the existing files; no new
dependencies, no build step. Files touched: `index.html`, `style.css`,
`js/main.js`, `js/game.js` (one small tweak to the glitch crawl). No other
behavior changes.

Requirement numbers refer to `.kiro/specs/polish/requirements.md`.

## Req 1 — control hint row

A thin hint row under the buttons that reads `A: next   B: select   C: back`,
shown only to first-time visitors, fading out after 3 A/B/C presses and
never shown again.

- `index.html`: add `<div id="hint" class="hint">` with three spans
  (`A: next`, `B: select`, `C: back`) as a child of `.room`, placed right
  after `.egg` so it sits just below the buttons.
- `style.css`: `.hint` is a small monospace flex row, dim ink color, with an
  opacity transition. `.hint.fading` animates opacity to 0.
- `js/main.js`: a `hintPresses` counter incremented on every A/B/C press
  (both the on-screen button click and the `a/b/c` keydown). On the 3rd
  press it adds `.fading` and, on `transitionend`, sets `hidden` so it
  leaves the flow. The "seen" flag is written to `localStorage` key
  `ghostagotchi.hint = "1"` immediately on the 3rd press, wrapped in
  try/catch. On load (game path only), if the flag is already `"1"` the
  hint is hidden immediately (no fade).
- Only the A/B/C buttons count (mute and other keys do not). The hint logic
  runs after the card-view early return, so it never runs on the share card.

## Req 2 — desktop egg scaling

- `style.css`: the phone default `.egg { width: min(78vw, 320px); ... }`
  stays unchanged. A `@media (min-width: 640px)` block sets
  `width: clamp(260px, 42vmin, 420px)` and `max-height: 72vh` so the LCD is
  easy to read on a desktop window while the egg still fits tall viewports.
- No horizontal scroll: `html, body { overflow: hidden }` already forbids it,
  and the clamp lower bound (260px) is well below the 640px breakpoint.
- Phones (portrait, <640px) keep the original `min(78vw, 320px)` sizing and
  layout exactly.

## Req 3 — glitch text stays inside the viewport

The current crawl uses `translateX(-60%) → 60%`, which pushes each line
off-screen on the left for half the loop (clipped by the container's
`overflow: hidden`). Two fixes:

- `style.css`: anchor each line at `left: 0` and bound the crawl to the
  viewport: `@keyframes crawl { from translateX(0); to
  translateX(calc(100vw - 100% - 2vw)); }`. Start (left edge at 0) and end
  (right edge at ~98vw) are both fully on-screen; the `-2vw` margin absorbs
  scrollbar/rounding so nothing is clipped at either edge.
- `js/game.js` (`fillGlitch`): tighten the vertical spread from
  `6 + i*15 + rand(0..5)` (up to ~86%) to `8 + i*13 + rand(0..3)` (up to
  ~76%) so the bottom line also clears the bottom edge on short windows.

## Req 4 — touch usability

- Buttons ≥48px: already `width/height: clamp(48px, 13vw, 64px)`, whose
  lower bound is 48px. No change needed; kept.
- Tapping never zooms: the viewport meta already has
  `maximum-scale=1, user-scalable=no`. Add `touch-action: manipulation` to
  `html, body` to also kill double-tap-to-zoom on the page chrome.
- Button labels not selectable: add
  `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none`
  to `.btn` (the existing `.btn-letter` rule stays) so the A/B/C letters
  can't be long-pressed/selected on touch.

## Req 5 — share feedback

- `js/main.js`: on a successful `navigator.clipboard.writeText`, swap the
  share button label to "LINK COPIED" for **2 s** (was 1.5 s) then restore.
- If `navigator.clipboard` is absent or `writeText` rejects, show the link
  in a selectable box instead of doing nothing.
- `index.html`: add `<div id="share-box" class="share-box" hidden>` inside
  `.room` containing a "COPY THIS LINK" label, a readonly
  `<input id="share-link">` (auto-focused and selected so a tap copies on
  mobile), and a close button.
- `style.css`: style `.share-box` as a small panel anchored just above the
  share button, with a selectable input.
- `js/main.js`: `showShareBox(url)` reveals the box, fills and selects the
  input; the close button and an 8 s auto-hide dismiss it. The success
  path is unchanged except for the 2 s duration.

## Req 6 — metadata + favicon

`index.html` `<head>` additions:
- `<meta name="description" content="…">` — a one-line pitch.
- Open Graph: `og:type=website`, `og:title`, `og:description`.
- `<link rel="icon" href="data:image/svg+xml,…">` — a pixel ghost drawn as
  an inline SVG (8x8 viewBox, `shape-rendering="crispEdges"`), dark LCD
  background + sickly-green ghost path matching the LCD palette, URL-encoded
  into the `href`. No external file, no emoji.

## Req 7 — no regressions

No changes to the meters, decay math, stages, haunt trigger/flow, neglect
message, play mini-game, sound, mute, or the read-only card view beyond
what the requirements above call for. Verified by `node --check` on every
JS file and by re-reading `index.html` to confirm all seven scripts still
load in order.

## Verification

- `node --check js/*.js` — every JS file parses.
- `index.html` still references all seven scripts in dependency order and
  no script path changed.
- Manual reasoning over the diff for each requirement (the session is
  non-interactive, so no browser run).
