# Requirements: Ghostagotchi

## 1. Hatching
- WHEN a player opens the game for the first time THEN the LCD shows a cracked egg that wobbles AND pressing any button hatches a ghost with a random name from a list of 40 spooky names.
- The ghost has 4 meters shown as icons on the LCD menu: Hunger (fears eaten), Joy, Candle (light), Haunt (how restless it is).

## 2. Life cycle
- Meters decay over real time: Hunger and Joy drop 1 point per 20 minutes, Candle drops 1 per 30 minutes. Haunt rises when any meter is 0.
- The ghost grows through 4 stages by age: Wisp (0-1 day), Specter (1-3 days), Poltergeist (3-7 days), Banshee (7+ days). Each stage has its own sprite and idle animation.
- WHEN Haunt reaches 10 THEN the ghost "haunts": the page dims, the LCD inverts, glitch text crawls across the screen, and the ghost must be calmed with 3 correct button presses shown as a pattern.

## 3. Buttons (exactly like the original)
- A cycles the menu icons, B selects, C cancels / goes back.
- Menu: Feed (pick a fear: Spiders, Dark, Mondays), Play (a reflex mini game: guess which side the ghost will float to), Light (relight the candle), Status (shows age, stage, meters), Lullaby (calms Haunt by 3).

## 4. Memory
- The ghost remembers neglect: if the game was closed for more than 12 hours with a meter at 0, on return it shows a message on the LCD like "YOU LEFT ME. AGAIN." before the menu.

## 5. Costume
- Haunted LCD feel: pixels fade out slowly (ghosting trail), random 1-frame flicker, a faint scanline overlay, the egg plastic has scratches and a sticker that reads "GHOSTAGOTCHI 1997".

## 6. Share
- A "Share my ghost" button copies a link with the ghost's name and stage in the URL so friends see a card of it.
