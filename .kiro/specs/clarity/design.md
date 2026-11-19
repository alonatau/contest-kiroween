# Design: Ghostagotchi clarity pass

Requirement numbers refer to `.kiro/specs/clarity/requirements.md`.

## Req 1: one fear per screen
- `js/game.js` `drawFeed()`: draw `Sprites.icons.feed` centered at the top (same call as `drawMenu`), `LCD.drawTextCentered(FEARS[feedIndex], 10)`, and `drawPositionDots(FEARS.length, feedIndex, 15)`. Remove the three-line list and the blinking ">" cursor. `feedInput` already cycles with A, feeds with B and goes back with C; keep that.

## Req 2: wider M, N, W
- `js/font.js`: allow glyph rows of different widths. Redefine M, N and W as 5-wide glyphs (M `#...#`,`##.##`,`#.#.#`,`#...#`,`#...#`; N `#...#`,`##..#`,`#.#.#`,`#..##`,`#...#`; W `#...#`,`#...#`,`#.#.#`,`##.##`,`#...#`). Expose `Font.w(ch)` returning a glyph's width (3 when unknown).
- `js/lcd.js`: `drawChar` loops over the glyph row's own length; `drawText` advances by `Font.w(ch) + 1`; `textWidth` sums those advances minus 1. `drawTextCentered` keeps using `textWidth`. Check the longest strings still fit 32 columns ("MONDAYS", "SPIDERS", "LULLABY", "POLTRG").

## Req 3: no ghosting across screens
- `js/lcd.js`: add `LCD.clearTrail()` that zeroes the `level` array.
- `js/game.js`: call `LCD.clearTrail()` inside `setMode()` and `setTransient()` (and in `startHaunt`/`exitHaunt`).

## Req 4: live button labels
- `js/game.js`: add `getButtonLabels()` returning three short uppercase strings for the current mode, exported on `Game`:
  - HATCH: HATCH / HATCH / HATCH
  - IDLE: MENU / MENU / MENU
  - MENU: NEXT / CHOOSE / BACK
  - FEED: NEXT / FEED / BACK
  - PLAY guess phase: LEFT / RIGHT / QUIT; reveal phase: WAIT / WAIT / WAIT; results: OK / OK / OK
  - STATUS: PAGE / BACK / BACK
  - LIGHT, LULLABY, EATING: OK / OK / OK
  - NEGLECT: SORRY / SORRY / SORRY
  - HAUNT show phase: WATCH / WATCH / WATCH; input phase: A / B / C
- `index.html`: replace the `#hint` row with `<div id="btn-labels" class="btn-labels" aria-live="polite">` holding three `<span>`s, placed right under the buttons so each span sits centered under its button (same flex layout and gap as `.buttons`).
- `style.css`: `.btn-labels` small monospace uppercase (about 11px, letter-spacing 1px, color `#cfe9c0` at 80% opacity), each span the width of a button, centered under it. Remove the old `.hint` rules.
- `js/main.js`: remove the hint fade logic and its localStorage key; in the existing loop set the three spans' text from `Game.getButtonLabels()` only when it changed.

## Req 5: How to play panel
- `index.html`: `<button id="help" class="help-btn" type="button">HOW TO PLAY</button>` styled like the SOUND pill, placed to its left; `<div id="help-panel" class="help-panel" hidden>` with a title, the text below, and a CLOSE button.
- Text: "Keep your ghost alive. FEED it fears, PLAY to cheer it up, LIGHT its candle, sing a LULLABY to calm it. STATUS shows its 4 meters: Hunger, Joy, Candle, Haunt. Time passes even when this tab is closed. Let a meter hit zero and it will haunt your screen."
- `style.css`: panel centered over the room, LCD-green border like `.share-box`, width min(90vw, 340px), 13px text.
- `js/main.js`: open/close handlers; Escape closes; while open, A/B/C keys do not reach the game. Hidden in card view.
