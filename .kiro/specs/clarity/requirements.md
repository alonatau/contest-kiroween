# Requirements: Ghostagotchi clarity pass

Goal: a first-time player can read every LCD screen and always knows what each button does right now. Plain HTML/CSS/vanilla JS, no build step, no new dependencies. Follow `.kiro/steering/product.md`.

1. WHEN the Feed screen is open THEN it shows ONE fear at a time, laid out like the main menu (icon on top, the fear's name centered on row 10, position dots on row 15). A shows the next fear, B feeds it, C goes back. No more three cramped lines of text.
2. WHEN any text is drawn on the LCD THEN every letter is readable: M, N and W get wider glyphs (5 columns) so they no longer look alike, and text spacing uses each glyph's own width.
3. WHEN the screen changes from one mode to another THEN the old screen's pixels do not ghost over the new one (clear the fade-out trail on a mode change). Ghosting stays for animation inside a screen.
4. WHEN the game is on any screen THEN a label sits directly under each of the A, B and C buttons saying what that button does on the current screen (for example NEXT / FEED / BACK on the Feed screen, LEFT / RIGHT / QUIT in the Play game). The labels update instantly when the screen changes. They replace the old "A: next B: select C: back" hint row and never fade out.
5. WHEN a player taps a small "HOW TO PLAY" button (next to SOUND) THEN a panel explains the goal in plain words: keep your ghost fed (Feed), happy (Play), lit (Light) and calm (Lullaby); what the 4 meters are; that time passes while the tab is closed; and that a neglected ghost haunts your screen. A close button hides it. It works on phone and desktop and is not shown in the share card view.
6. Everything else behaves exactly as before (meters, stages, haunt, neglect, mini-game, sound, share, card view).
