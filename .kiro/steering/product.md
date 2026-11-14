# Ghostagotchi

The 1997 virtual pet, resurrected as a ghost. A browser game for the Kiroween 2026 hackathon
(categories: Resurrection, Costume Contest).

## The pitch
Your Tamagotchi died in 1998 because you forgot to feed it during summer camp. It is back, and it remembers.
Raise a ghost pet inside a haunted LCD egg: feed it fears, play with it, keep its candle lit. Neglect it and it haunts your screen.

## Rules for the build
- Plain HTML, CSS and vanilla JavaScript, no framework, no build step, no paid services. Deploys as static files.
- One screen: a glowing plastic egg with a monochrome dot-matrix LCD in the middle and 3 physical buttons (A, B, C) under it, like the original.
- Pixel art drawn in code on a canvas at 32x16 LCD resolution, scaled up crisp (image-rendering: pixelated).
- Look: dark room, the egg is translucent bone-white plastic, LCD is sickly green with ghosting trails, faint CRT flicker. Solid colors only, no gradients on buttons, no purple, no emojis.
- State saved in localStorage so the ghost lives between visits. Time passes while the tab is closed (computed from timestamps).
- Works on phone and desktop. Keyboard: A, B, C keys map to the 3 buttons.
- Sound: tiny square-wave beeps made with WebAudio, mute toggle.
