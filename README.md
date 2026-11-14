# Ghostagotchi

The 1997 virtual pet, resurrected as a ghost. A browser game for the Kiroween
2026 hackathon (categories: _Resurrection_, _Costume Contest_).

Your Tamagotchi died in 1998 because you forgot to feed it during summer camp.
It is back, and it remembers. Raise a ghost pet inside a haunted LCD egg: feed
it fears, play with it, keep its candle lit. Neglect it and it haunts your
screen.

## Run it

No build step, no dependencies, no paid services — just static files.

- **Easiest:** double-click `index.html`. It works straight from `file://`
  because every script is a plain classic `<script>` (no ES modules, so no CORS
  on the local filesystem).
- **Or serve it** with any static server, e.g.:
  ```sh
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

The ghost is saved in `localStorage`, so it lives between visits, and time
passes while the tab is closed (meters decay from the stored timestamp).

## Controls

- **A / B / C buttons** — click them, or press the **A / B / C** keys.
  - **A** cycles the menu icons.
  - **B** selects.
  - **C** cancels / goes back.
  - On the home screen, any button opens the menu.
  - On the hatching and "you left me" screens, any button continues.
- **M** — toggle sound.
- The mini-game: **A** guesses left, **B** guesses right (which side the ghost
  floats to), **C** quits.

## How it works

- **One screen:** a glowing plastic egg with a 32×16 monochrome dot-matrix LCD
  and three physical buttons, drawn with CSS. Pixel art is drawn in code on a
  `<canvas>` at 32×16 and scaled up crisp (`image-rendering: pixelated`).
- **Haunted LCD:** pixels fade out over 4 frames (ghosting trails), random
  1-frame flicker, a faint scanline overlay, and the egg has scratches and a
  `GHOSTAGOTCHI 1997` sticker.
- **4 meters:** Hunger (fears eaten), Joy, Candle (light), Haunt (how restless
  it is). Hunger and Joy drop 1 point / 20 min, Candle 1 / 30 min. Haunt rises
  while any meter sits at 0.
- **Life cycle by age:** Wisp (0–1 day) → Specter (1–3) → Poltergeist (3–7) →
  Banshee (7+). Each stage has its own sprite and a 2-frame idle animation.
- **Menu:** Feed (pick a fear: Spiders, Dark, Mondays), Play (a left/right
  guessing mini-game, 5 rounds), Light (relight the candle), Status (stage, age,
  and the four meters), Lullaby (calms Haunt by 3).
- **Haunt event:** when Haunt reaches 10, the room dims, the LCD inverts, glitch
  text crawls across the screen, and you must calm the ghost by repeating a
  3-button pattern.
- **Memory:** if you leave the game closed for more than 12 hours with a meter
  at 0, on return it shows `YOU LEFT ME. AGAIN.` before the menu.
- **Sound:** tiny square-wave beeps via WebAudio, with a mute toggle.
- **Share:** "SHARE MY GHOST" copies a link with the ghost's name and stage; that
  URL opens a read-only card of the ghost.

## Project layout

```
index.html      page shell: the egg, LCD canvas, buttons, mute, share, card
style.css       dark room, translucent bone-white egg, LCD, buttons, haunt FX
js/font.js      3×5 dot-matrix font
js/sprites.js   egg / cracked egg / 4 ghost stages / menu + meter icons / names
js/lcd.js       pixel-buffer renderer: ghosting, flicker, inversion, text, bars
js/sound.js     WebAudio square-wave beeps
js/state.js     ghost state, localStorage, real-time decay, stages, neglect
js/game.js      screen state machine, menu, mini-game, haunt event, loop
js/main.js      DOM + keyboard wiring, mute, share link, card view, loop
```

## How Kiro was used

Kiro (the agentic AI assistant) built the whole game from this repository's
spec, working through the staged task list in
`.kiro/specs/ghostagotchi/tasks.md` and following the product rules in
`.kiro/steering/product.md`. It:

1. Read the steering and spec files (requirements + tasks).
2. Implemented the tasks in order — page shell, LCD renderer, sprites, state and
   time, menu/actions, the play mini-game, the haunt event, sound, the share
   link, and this README — ticking each task off as it finished.
3. Validated as it went: a Node script checked every sprite bitmap's dimensions
   (catching two hand-drawn eggs that were 16px wide, not 14), and logic + flow
   tests (run in a mocked browser environment) verified meter decay, the Haunt
   math, stages, and the full screen flow (hatch → menu → feed → play → status
   → lullaby → light → haunt → calm → neglect) with no runtime errors. It also
   dumped composed LCD frames as ASCII to eyeball the layout. The temporary
   test scripts were removed afterwards to keep the workspace clean.

No code was written by hand outside the agent; the agent authored all source
files. The build follows the constraints: plain HTML/CSS/vanilla JS, no
framework, no build step, no paid services.

## License

MIT License. See `LICENSE`.

Copyright (c) 2026 Ghostagotchi contributors.
