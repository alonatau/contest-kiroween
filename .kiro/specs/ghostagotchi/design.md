# Design: Ghostagotchi

Architecture as it is actually built. Plain HTML/CSS/vanilla JS, no build
step, no framework, no dependencies. Ships as static files served from the
repo root (`index.html`, `style.css`, `js/*.js`).

## 1. File map

```
index.html      page shell: the room, the egg, the LCD canvas, 3 buttons,
                mute toggle, share link, share card. Loads the 7 scripts in
                dependency order as classic (non-module) scripts.
style.css       dark room, translucent bone-white egg, sickly green LCD,
                buttons, haunt overlays, share card. Solid colors only.
js/font.js      global `Font`  — 3x5 dot-matrix glyph set + metrics.
js/sprites.js   global `Sprites` (egg, cracked, 4 stage sprites with 2 idle
                frames each, menu icons, meter icons) and global `NAMES`.
js/lcd.js       global `LCD`   — the 32x16 haunted LCD renderer.
js/sound.js     global `Sound` — square-wave beeps via WebAudio.
js/state.js     global `State` — the ghost: persistence, decay, stages,
                haunt, neglect.
js/game.js      global `Game`  — screen state machine, menus, play mini-game,
                haunt event, per-frame draw.
js/main.js      IIFE entry point: wires DOM + keyboard to Game, runs the
                loop, mute, share link, read-only card view.
```

All scripts are classic scripts that share the top-level (global) scope, so
each module just declares one global (`Font`, `Sprites`, `LCD`, `Sound`,
`State`, `Game`). `main.js` is wrapped in an IIFE and owns the rest. Load
order in `index.html` is fixed by the dependency chain:
`font → sprites → lcd → sound → state → game → main`.

## 2. Modules

### Font (`font.js`)
A 3x5 dot-matrix font. Each glyph is an array of 5 strings of width 3, `#`
on / `.` off. Covers A–Z, 0–9, and the punctuation the game uses
(`. , ! ? : - / ' < >` and space). Exposes:
- `Font.glyphs` — `{ char: [row,…] }`
- `Font.width = 3`, `Font.height = 5`, `Font.advance = 4` (glyph + 1px gap;
  8 glyphs fit across 32px: `8*3 + 7*1 = 31`).

### Sprites (`sprites.js`)
Bitmaps for the LCD. Each sprite is `{ w, h, frames: [[row,…],…] }`, `#` on.
- `egg`, `cracked` — 16x14; wobble is a renderer-applied x-offset, not a
  separate frame.
- Stage sprites (2 idle frames each, frame 0 open-eyed, frame 1 blink/drift):
  `wisp` 10x10, `specter` 12x12, `poltergeist` 14x12, `banshee` 16x13.
- `Sprites.icons` — 12x8 menu icons: `feed`, `play`, `light`, `status`, `lull`.
- `Sprites.meters` — 8x8 meter icons: `hunger`, `joy`, `candle`, `haunt`.
- `NAMES` — 40 spooky names, all ≤8 chars so they fit on the 32px LCD.

### LCD (`lcd.js`)
The haunted LCD renderer. Logical resolution 32x16; the canvas element is
that size and is scaled up crisp by CSS (`image-rendering: pixelated`).

Two buffers:
- `target` — `Uint8Array(32*16)`, 0/1: what the game drew this frame.
- `level` — `Float32Array(32*16)`, 0..1: the actual rendered intensity
  (drives ghosting).

Frame pipeline (`render()`):
1. Ghosting: any lit target pixel snaps `level` to `1`; an unlit pixel fades
   by `0.25` per frame, so a turned-off pixel takes 4 frames to reach 0
   (the dying-LCD trail).
2. Flicker: on ~6% of frames the whole field dims to `0.55` for one frame.
3. Inversion (haunt): when inverted, a "lit" pixel maps to the dark LCD
   color and the field maps to the lit color (positive → negative).
4. Colors are lerped per-pixel between `OFF=#0a160a` and `ON=#8fd86a` by
   `level*dim`, written into one `ImageData` and blitted with
   `putImageData`.

Drawing helpers (all write `target`, not the canvas): `clear`, `on`, `off`,
`drawSprite`, `drawSpriteCentered`, `drawChar`, `drawText`,
`drawTextCentered`, `textWidth`, `drawHBar`, `drawVBar`. `setInverted(v)`
toggles haunt inversion.

### Sound (`sound.js`)
Tiny square-wave beeps. A WebAudio `AudioContext` is created lazily on the
first user gesture (autoplay policy) via `Sound.resume()`; `main.js` calls
`unlock()` on the first click/keypress. When muted, every call is a silent
no-op (`ensure()` returns null). `tone(freq, dur, when, vol)` builds an
oscillator → gain → destination chain with a short attack/decay envelope.
Named SFX: `press`, `select`, `cancel`, `blip`, `feed`, `light`, `lullaby`,
`win`, `lose`, `hatch`, `haunt`, `calm`. Mute state: `isMuted`, `setMuted`,
`toggle`, `resume`.

### State (`state.js`)
The ghost and all real-time math. Persists to `localStorage` under
`ghostagotchi.v1` (the ghost object) and `ghostagotchi.sound` ("0"/"1").
All `localStorage` access is wrapped in try/catch so the game still runs in
private mode / with storage disabled.

The ghost object:
```js
{
  name:   "MORTIMER",      // from NAMES, ≤8 chars
  born:   1699…,           // ms timestamp — hatching instant
  last:   1699…,           // ms timestamp — last decay checkpoint
  lastSeen: 1699…,         // set at hatch so birth never triggers neglect
  meters: {
    hunger: 10,  // 0..MAX, decays
    joy:    10,  // 0..MAX, decays
    candle: 10,  // 0..MAX, decays
    haunt:   0,  // 0..MAX, rises when a meter is at 0
  },
}
```

Constants:
- `MAX = 10` (meter cap).
- `DECAY` — ms per point lost: `hunger` 20 min, `joy` 20 min, `candle` 30 min.
- `HAUNT_RATE = 10 min` per Haunt point, accrued only while ≥1 meter is 0.
- `NEGLECT_MS = 12 h` — away-time that triggers the neglect message.
- `STAGES` — by age: WISP (0), SPECTER (1 day), POLTERGEIST (3 days),
  BANSHEE (7 days).

API surface: `load`, `save`, `hasGhost`, `get`, `hatch(optName)`,
`ageMs`, `stageIndex/stageName/stageKey`, `applyDecay`, `feed(fearKey)`,
`light`, `addJoy(n)`, `lullaby`, `calmHaunt`, `isHaunting`,
`setNeglectPending/consumeNeglect`, `getSound/setSound`, `sharePayload`,
`reset`.

Feeding amounts (`FEED`): SPIDERS +3, DARK +4, MONDAYS +2. Light +5 candle.
Lullaby −3 haunt. Play mini-game adds Joy equal to wins.

### Game (`game.js`)
The screen state machine and per-frame logic. See §5 and §6.

### main.js
Entry point IIFE. Responsibilities:
- Initialize `LCD` on the canvas.
- If the URL has `?ghost=NAME&stage=STAGE`, render the static share card and
  return (no game loop).
- Else call `Game.init()`, wire the 3 buttons + A/B/C keys (+ M for mute)
  to `Game.pressA/B/C` and `toggleMute`, with a short `.pressed` visual.
- Run the loop: `setInterval(Game.tick, 100)` (10 fps). Every 50 ticks (5 s)
  call `State.save()` and `updateShare()`. Also save on `visibilitychange`
  (hidden) and `pagehide` so away-time is recorded accurately.
- Mute toggle synced to `State.getSound()`.
- Share link builder + clipboard copy (see §8).

## 3. Render loop

`main.js` runs `Game.tick()` every 100 ms. `tick()`:
1. `animFrame++` (drives all idle/blinking/wobble/scroll animations).
2. Apply live meter decay via `State.applyDecay()` unless the mode is
   `HATCH`, `NEGLECT`, or `HAUNT` (those freeze the world).
3. If not in a haunt and `State.isHaunting()` becomes true, `startHaunt()`.
4. Decrement `bornTimer` (post-hatch name overlay).
5. Decrement transient-mode `modeTimer`; on reaching 0, switch to
   `modeNext`.
6. Step the haunt state machine (`tickHaunt`) or play state machine
   (`tickPlay`) when in those modes.
7. `draw()` — clear the LCD target and dispatch on `mode`.
8. `LCD.render()` — apply ghosting/flicker/invert and blit.

Persistence is deliberately slower than the loop: `applyDecay` updates the
in-memory ghost every tick but only writes to `localStorage` every 5 s and
on tab hide/unload, to avoid thrashing storage.

## 4. Time decay math (`State.applyDecay`)

`elapsed = now - ghost.last`. If `elapsed <= 0`, nothing changes.

Meter decay is continuous (floats, clamped 0..MAX). For each decaying
meter, points lost = `elapsed / DECAY.meter`; the new value is
`clamp(start - loss, 0, MAX)`.

Haunt accrues only for the portion of the interval during which at least
one meter was 0. To find that portion, for each decaying meter it computes
the moment it reached 0 within the interval:
- If the meter was already 0 at `ghost.last`, that meter was zero for the
  whole interval (`earliestZero = ghost.last`).
- Else `hitAt = ghost.last + startVal * rate`; if `hitAt < now`, that is a
  candidate for `earliestZero`.

`earliestZero` = the earliest such moment across all three meters. If any
meter hit 0, `zeroTime = now - earliestZero` and
`m.haunt = clamp(m.haunt + zeroTime / HAUNT_RATE, 0, MAX)`.

Then `ghost.last = now`. Flags returned to the caller:
- `justHaunted` — `beforeHaunt < MAX && m.haunt >= MAX` (drives the
  one-shot `startHaunt` trigger).
- `neglect` — `elapsed > NEGLECT_MS && (hunger<=0 || joy<=0 || candle<=0)`.

Stages are pure functions of age (`ageMs = now - born`) against `STAGES`,
evaluated on demand (`stageIndex/stageName/stageKey`); they are not stored.

## 5. Screen state machine (`Game.mode`)

One mode at a time. Modes and transitions (A/B/C are the three buttons):

```
HATCH    cracked egg wobble. ANY button → doHatch() → IDLE.
         (first visit only; if a ghost already exists, init() skips this.)

IDLE     stage sprite idle (bob + blink), candle meter icon top-right,
         meter-warning icon top-left if a meter is critical, name flashes
         for ~2.6 s after hatching. ANY button → openMenu() → MENU.

MENU     icon + label + position dots. A: cycle menuIndex. B: select.
         C: back → IDLE. Items: FEED, PLAY, LIGHT, STATUS, LULL.

FEED     three fears listed with a blinking `>` cursor. A: cycle feedIndex.
         B: feed + transient EATING. C: back → MENU.

EATING*  "YUM" confirm. transient 16 ticks → IDLE (any button also exits).

PLAY     reflex mini-game (see §7).

LIGHT*   "LIT" confirm. transient 16 ticks → IDLE (any button also exits).

LULLABY* "SHHH" confirm. transient 24 ticks → IDLE (any button also exits).

STATUS   two pages, A cycles. Page 0: stage short-name + age. Page 1: four
         meter icons across the top with vertical bars beneath. B/C → MENU.

NEGLECT  blinking haunt skull + scrolling "YOU LEFT ME. AGAIN." ANY button
         → dismissNeglect() → IDLE (or HAUNT if haunt topped out).

HAUNT    inverted LCD, room dims, glitch text. calm pattern (see §7).
```
`*` transient: `setTransient(mode, ticks, next)` runs it for `ticks` frames
then returns to `next`; any button advances early.

`init()` order on load: set mute from stored pref → `State.load()` → if no
ghost, `HATCH`; else `applyDecay()` → if `neglect`, `NEGLECT`; else if
already haunting, `startHaunt()`; else `IDLE`.

## 6. Input routing

`Game.pressA/B/C` all funnel into `route(btn)`, which branches:
- `HATCH` / `NEGLECT` → any button resolves the screen.
- `HAUNT` → `hauntPress(btn)` (pattern matching).
- `PLAY` → `playInput(btn)` (guess / dismiss results).
- `STATUS` → `statusInput(btn)` (A cycle, B/C back).
- `IDLE` → any button opens the menu.
- `MENU` → `menuInput` (A cycle, B select, C back).
- `FEED` → `feedInput`.
- transient `LIGHT/LULLABY/EATING` → any button ends early.

`main.js` maps keyboard `a/b/c` to the same three handlers (and `m` to
mute) and mirrors the press onto the on-screen button's `.pressed` class.

## 7. Mini-games and the haunt

### Play (reflex mini-game)
5 rounds. Each round: GUESS (ghost sits center, `< A` and `B >` hints) →
player presses A (left) or B (right) → `commitGuess` rolls `side` 0/1 →
REVEAL slides the sprite `dx` toward the chosen side over 10 ticks →
ROUNDEND shows `OK`/`NO` for 14 ticks → next round or RESULTS. C cancels
back to MENU. RESULTS shows `WINS n/5` and `JOY +n`; any button → MENU.
Joy is added once at the end via `State.addJoy(wins)`.

### Haunt event
Triggered when `haunt` reaches MAX. `startHaunt()`:
- mode = `HAUNT`; `LCD.setInverted(true)`; `#room` gets `.haunting`
  (dims overlay, egg shake + hue shift, mute/share dimmed); `fillGlitch()`
  populates `#glitch-crawl`; `Sound.haunt()`.
- A random 3-button pattern (A/B/C) is shown one cell at a time in three
  boxed cells, then the player must REPEAT it in order.
- Phases: `show` (reveal pattern) → `input` (repeat; correct advances
  `step`, wrong → `fail`) → `fail` (12-tick "NO", then re-show) → `win`
  (16-tick "CALM", `Sound.calm()`, then `exitHaunt()`).
- `exitHaunt()` calms haunt to 0, uninverts the LCD, removes `.haunting`,
  clears the glitch crawl, → IDLE.

## 8. Share / card view

`State.sharePayload()` returns `{ name, stage }` for a hatched ghost.
`main.js` builds `?ghost=NAME&stage=STAGE` against `location.origin +
location.pathname` and sets it as the share link's `href` (hidden until a
ghost exists). Clicking the share link tries `navigator.clipboard.writeText`
and swaps the label to "LINK COPIED" briefly.

Card view: when the page is opened with both `ghost` and `stage` query
params, `main.js` adds `body.cardview` (hides `.room`, shows `.card`),
renders the stage sprite onto the 128x64 card canvas via an offscreen
32x16 canvas scaled up with smoothing off, fills the name/stage, and
returns before starting the game loop. The card links back to `./` to
raise your own.

## 9. Look and feel (CSS)

- Dark room: a radial vignette with a faint warm glow behind the egg and a
  sparse speckle overlay (no flat black).
- Egg: translucent bone-white plastic via stacked `box-shadow` inset
  highlights/shadows; thin scratch lines, a crack, and a rotated
  "GHOSTAGOTCHI 1997" sticker.
- LCD: bezel + canvas (`image-rendering: pixelated`) + a scanline overlay
  (repeating gradient, multiply blend) + a glass reflection. A `.flicker`
  class (toggled by JS) briefly drops brightness for CRT feel.
- Buttons: circular caps with a 3D drop, `.pressed` lowers the cap, an
  `.active-indicator` ring. Solid colors only — no gradients on buttons.
- Haunt overlays: a fixed dim layer, an egg shake keyframe, and the
  glitch-crawl band of scrambled red text with chromatic shadows.
- Share card: a centered panel with the pixel sprite, name, stage, note,
  and a link back.

## 10. Build / deploy

No build step. Serve the repo root as static files (e.g. `python3 -m
http.server` or any static host). Everything is client-side; the only
runtime storage is `localStorage`. Deployed as-is (the repo includes a
`.vercel` config), matching the steering rule of plain HTML/CSS/vanilla JS
with no paid services.
