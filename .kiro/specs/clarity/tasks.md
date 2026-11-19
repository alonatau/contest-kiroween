# Tasks: Ghostagotchi clarity pass

- [ ] 1. Feed screen shows one fear at a time (icon, centered name on row 10, position dots on row 15).
- [ ] 2. Variable-width font: 5-wide M, N, W; `Font.w`; `drawChar`, `drawText`, `textWidth` use per-glyph widths.
- [ ] 3. `LCD.clearTrail()` and call it on every mode change so screens do not ghost into each other.
- [ ] 4. Live A/B/C labels under the buttons from `Game.getButtonLabels()`; remove the old hint row, its CSS and its localStorage logic.
- [ ] 5. HOW TO PLAY button and panel (Escape and CLOSE hide it; game keys ignored while open; hidden in card view).
- [ ] 6. Update the README Controls section to mention the live labels and the HOW TO PLAY panel.
- [ ] 7. Verify: `node --check` every JS file; index.html still loads all scripts in order; no other behavior changed.
