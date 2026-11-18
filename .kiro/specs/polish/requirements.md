# Requirements: Ghostagotchi polish pass

Goal: make the first 30 seconds clear and delightful for a judge who has never seen the game, without changing the core loop.

1. WHEN a player visits for the first time THEN a small hint row under the buttons reads "A: next   B: select   C: back"; it fades out after 3 button presses and stays hidden on later visits (localStorage, wrapped in try/catch).
2. WHEN the window is a desktop size THEN the egg scales up with the viewport (about 42vmin, min 260px, max 420px) so the LCD is easy to read; phone layout stays as it is with no horizontal scroll.
3. WHEN the haunt event shows glitch text THEN every line stays fully inside the viewport (no text cut off at the edges).
4. WHEN played on a touch screen THEN the A/B/C buttons are at least 48px, tapping never zooms the page, and button labels cannot be text-selected.
5. WHEN the player taps "SHARE MY GHOST" THEN a short "LINK COPIED" message appears for 2 seconds; if the clipboard is blocked, show the link in a selectable box instead.
6. The page has a clear title, a description meta tag, Open Graph tags (title, description), and a pixel ghost favicon as an inline SVG data URI.
7. Everything else behaves exactly as before (meters, stages, haunt, neglect message, mini-game, sound, card view). Plain HTML/CSS/vanilla JS, no build step, no new dependencies.
