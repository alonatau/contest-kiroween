# Tasks: Ghostagotchi polish pass

- [x] 1. Add the `#hint` control row (`A: next   B: select   C: back`) under the buttons in `index.html`; style it in `style.css`; in `main.js` fade it out after 3 A/B/C presses and persist "seen" in `localStorage` (try/catch); hide it immediately on later visits.
- [x] 2. Scale the egg up on desktop (`@media (min-width: 640px)` → `clamp(260px, 42vmin, 420px)`, `max-height: 72vh`); keep the phone layout as-is with no horizontal scroll.
- [x] 3. Keep every haunt glitch line fully inside the viewport: bounded horizontal crawl (`left:0` + `translateX(0 → calc(100vw - 100% - 2vw))`) and tightened vertical spread in `game.js` `fillGlitch`.
- [x] 4. Touch: keep A/B/C buttons ≥48px, add `touch-action: manipulation` to `html, body` so tapping never zooms, and make button labels unselectable (`user-select`/`-webkit-user-select`/`-webkit-touch-callout: none` on `.btn`).
- [x] 5. Share: show "LINK COPIED" for 2 s on success; if the clipboard is blocked, show the link in a selectable box (`#share-box` + `#share-link`).
- [x] 6. Add `<title>` (already present), a description meta tag, Open Graph tags (title, description), and a pixel-ghost favicon as an inline SVG data URI.
- [x] 7. Verify: `node --check` every JS file; confirm `index.html` still loads all seven scripts in order; confirm no changes to meters/stages/haunt/neglect/mini-game/sound/card view.
