/* =========================================================================
   game.js — the game: screen state machine, menu/actions, the play
   mini-game, the haunt event, and the per-frame draw loop.
   Exposes a global `Game` object.
   ========================================================================= */

const Game = (function () {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  // ---- modes ----------------------------------------------------------
  let mode = "HATCH"; // HATCH | IDLE | MENU | FEED | PLAY | LIGHT |
                     // STATUS | LULLABY | NEGLECT | HAUNT
  let menuIndex = 0;
  const MENU_ITEMS = ["FEED", "PLAY", "LIGHT", "STATUS", "LULL"];
  const FEARS = ["SPIDERS", "DARK", "MONDAYS"];
  let feedIndex = 0;
  let statusPage = 0;

  // transient screen support
  let modeTimer = 0;     // ticks remaining in a transient mode
  let modeNext = "IDLE"; // where to go when the timer ends

  // play mini-game state
  let play = null;

  // haunt event state
  let haunt = null;

  // intro overlay after hatching
  let bornTimer = 0;

  let animFrame = 0;

  const STAGE_SHORT = ["WISP", "SPECTER", "POLTRG", "BANSHEE"];

  // ---- helpers --------------------------------------------------------
  function stageSprite() { return Sprites[State.stageKey()]; }

  function bobDy() { return Math.round(Math.sin(animFrame * 0.35)); }

  // mostly open eyes; blink (frame 1) briefly every ~3s
  function idleFrame() { return (animFrame % 34 < 3) ? 1 : 0; }

  function wobbleDx() {
    const p = animFrame % 24;
    if (p < 6) return -2;
    if (p < 12) return 0;
    if (p < 18) return 2;
    return 0;
  }

  function ageText() {
    const a = State.ageMs();
    const d = Math.floor(a / DAY);
    if (d >= 1) return "AGE " + d + "D";
    const h = Math.floor(a / HOUR);
    return "AGE " + h + "H";
  }

  // small candle indicator (4x6) drawn at (x,y); reflects candle meter
  function drawCandle(x, y, c) {
    const low = c <= 3, dead = c <= 0;
    let flame = false;
    if (!dead) flame = low ? (animFrame % 6 < 3) : true;
    if (flame) {
      LCD.on(x + 2, y + 0);
      LCD.on(x + 1, y + 1); LCD.on(x + 2, y + 1);
      LCD.on(x + 1, y + 2); LCD.on(x + 2, y + 2);
      LCD.on(x + 2, y + 3);
    }
    const showBody = !dead || (animFrame % 8 < 4);
    if (showBody) {
      LCD.on(x + 1, y + 4); LCD.on(x + 2, y + 4); LCD.on(x + 3, y + 4);
      LCD.on(x + 1, y + 5); LCD.on(x + 2, y + 5); LCD.on(x + 3, y + 5);
    }
  }

  // blinking warning icon at top-left if a meter is critical
  function drawMeterWarning(m) {
    let icon = null;
    if (m.hunger <= 0) icon = Sprites.meters.hunger;
    else if (m.joy <= 0) icon = Sprites.meters.joy;
    else if (m.haunt >= 7) icon = Sprites.meters.haunt;
    if (!icon) return;
    if (animFrame % 8 < 5) LCD.drawSprite(icon, 0, 0, 0);
  }

  function drawPositionDots(count, idx, y) {
    const step = 4;
    const total = count + (count - 1) * (step - 1);
    let x = (LCD.W - total) >> 1;
    for (let i = 0; i < count; i++) {
      if (i === idx) { LCD.on(x, y); LCD.on(x + 1, y); LCD.on(x + 2, y); }
      else { LCD.on(x, y); }
      x += step;
    }
  }

  // ---- mode switching -------------------------------------------------
  function setMode(m) { mode = m; modeTimer = 0; }
  function setTransient(m, ticks, next) { mode = m; modeTimer = ticks; modeNext = next; }

  function goIdle() { setMode("IDLE"); }

  // ---- init -----------------------------------------------------------
  function init() {
    Sound.setMuted(!State.getSound());
    State.load();
    if (!State.hasGhost()) { setMode("HATCH"); return; }
    const r = State.applyDecay();
    if (r.neglect) { State.setNeglectPending(true); setMode("NEGLECT"); return; }
    if (State.isHaunting()) { startHaunt(); return; }
    goIdle();
  }

  // ---- per-frame update ----------------------------------------------
  function tick() {
    animFrame++;

    // live decay (cheap; persistence handled on a slower cadence in main)
    if (mode !== "HATCH" && mode !== "NEGLECT" && mode !== "HAUNT") {
      State.applyDecay();
    }

    // trigger a haunt event whenever meters push haunt to the top
    if (mode !== "HAUNT" && mode !== "HATCH" && mode !== "NEGLECT" && State.isHaunting()) {
      startHaunt();
    }

    // intro overlay
    if (bornTimer > 0) bornTimer--;

    // transient mode timers
    if (modeTimer > 0) {
      modeTimer--;
      if (modeTimer === 0) setMode(modeNext);
    }

    // haunt state machine
    if (mode === "HAUNT") tickHaunt();

    // play mini-game state machine
    if (mode === "PLAY") tickPlay();

    draw();
    LCD.render();
  }

  // ---- draw dispatch --------------------------------------------------
  function draw() {
    LCD.clear();
    switch (mode) {
      case "HATCH": drawHatch(); break;
      case "IDLE": drawIdle(); break;
      case "MENU": drawMenu(); break;
      case "FEED": drawFeed(); break;
      case "EATING": drawEating(); break;
      case "PLAY": drawPlay(); break;
      case "LIGHT": drawLight(); break;
      case "LULLABY": drawLullaby(); break;
      case "STATUS": drawStatus(); break;
      case "NEGLECT": drawNeglect(); break;
      case "HAUNT": drawHaunt(); break;
    }
  }

  // ---- screens --------------------------------------------------------
  function drawHatch() {
    LCD.drawSpriteCentered(Sprites.cracked, 0, wobbleDx(), 0);
  }

  function drawIdle() {
    const m = State.get().meters;
    const sp = stageSprite();
    LCD.drawSpriteCentered(sp, idleFrame(), 0, bobDy());
    drawMeterWarning(m);
    drawCandle(28, 0, m.candle);
    if (bornTimer > 0 && (animFrame % 6 < 4)) {
      LCD.drawTextCentered(State.get().name, 5);
    }
  }

  function drawMenu() {
    const key = MENU_ITEMS[menuIndex].toLowerCase();
    const icon = Sprites.icons[key] || Sprites.icons.feed;
    // icon centered horizontally, upper area
    LCD.drawSpriteCentered(icon, 0, 0, -3);
    // label
    const label = MENU_ITEMS[menuIndex];
    LCD.drawTextCentered(label, 10);
    // position dots
    drawPositionDots(MENU_ITEMS.length, menuIndex, 15);
  }

  function drawFeed() {
    // cursor + three fear options packed top-to-bottom
    for (let i = 0; i < FEARS.length; i++) {
      const y = i * 5; // rows 0-4, 5-9, 10-14
      if (i === feedIndex && (animFrame % 8 < 5)) LCD.drawText(">", 0, y);
      LCD.drawText(FEARS[i], 3, y);
    }
  }

  function drawEating() {
    LCD.drawSpriteCentered(Sprites.icons.feed, 0, 0, -3);
    LCD.drawTextCentered("YUM", 10);
  }

  function drawLight() {
    LCD.drawSpriteCentered(Sprites.icons.light, 0, 0, -3);
    LCD.drawTextCentered("LIT", 10);
  }

  function drawLullaby() {
    LCD.drawSpriteCentered(Sprites.icons.lull, 0, 0, -3);
    LCD.drawTextCentered("SHHH", 10);
  }

  function drawStatus() {
    const m = State.get().meters;
    if (statusPage === 0) {
      LCD.drawTextCentered("STAGE", 0);
      LCD.drawTextCentered(STAGE_SHORT[State.stageIndex()], 6);
      LCD.drawTextCentered(ageText(), 11);
      // little ghost under the age for flavour
    } else {
      // four meter icons across the top
      const icons = [Sprites.meters.hunger, Sprites.meters.joy,
      Sprites.meters.candle, Sprites.meters.haunt];
      const vals = [m.hunger, m.joy, m.candle, m.haunt];
      for (let i = 0; i < 4; i++) {
        LCD.drawSprite(icons[i], i * 8, 0, 0);
        LCD.drawVBar(i * 8 + 1, 9, 6, 6, vals[i], State.MAX);
      }
    }
  }

  function drawNeglect() {
    // blinking skull up top
    if (animFrame % 8 < 5) LCD.drawSpriteCentered(Sprites.meters.haunt, 0, 0, 0);
    // scrolling message
    const phrase = "YOU LEFT ME. AGAIN.";
    const tw = LCD.textWidth(phrase);
    const span = tw + LCD.W;
    const x = LCD.W - (animFrame % span);
    LCD.drawText(phrase, x, 6);
  }

  // ---- play mini-game -------------------------------------------------
  function startPlay() {
    play = { round: 0, wins: 0, phase: "GUESS", t: 0, side: 0, guess: 0, dx: 0 };
    setMode("PLAY");
  }

  function tickPlay() {
    if (!play) return;
    if (play.phase === "REVEAL") {
      play.t++;
      const span = 10;
      const target = play.side === 0 ? -8 : 8;
      play.dx = Math.round((play.t / span) * target);
      if (play.t >= span) {
        const correct = play.guess === play.side;
        if (correct) { play.wins++; Sound.win(); }
        else Sound.lose();
        play.phase = "ROUNDEND";
        play.t = 0;
        play.correct = correct;
      }
    } else if (play.phase === "ROUNDEND") {
      play.t++;
      if (play.t > 14) {
        play.round++;
        if (play.round >= 5) {
          play.phase = "RESULTS";
          State.addJoy(play.wins);
        } else {
          play.phase = "GUESS";
          play.dx = 0;
        }
      }
    }
  }

  function drawPlay() {
    if (!play) return;
    const sp = stageSprite();
    if (play.phase === "GUESS") {
      // round progress dots at the top
      for (let i = 0; i < 5; i++) {
        const x = 7 + i * 4;
        if (i < play.round) LCD.on(x, 0);
        else if (i === play.round && animFrame % 6 < 3) { LCD.on(x, 0); LCD.on(x + 1, 0); LCD.on(x + 2, 0); }
      }
      LCD.drawSpriteCentered(sp, idleFrame(), 0, bobDy());
      // A = left, B = right hints at the side edges
      LCD.drawText("<", 1, 4); LCD.drawText("A", 1, 10);
      LCD.drawText(">", 28, 4); LCD.drawText("B", 28, 10);
    } else if (play.phase === "REVEAL" || play.phase === "ROUNDEND") {
      LCD.drawSpriteCentered(sp, idleFrame(), play.dx, bobDy());
      if (play.phase === "ROUNDEND") {
        LCD.drawText(play.correct ? "OK" : "NO", play.side === 0 ? 0 : 26, 11);
      }
    } else if (play.phase === "RESULTS") {
      LCD.drawTextCentered("WINS " + play.wins + "/5", 3);
      LCD.drawTextCentered("JOY +" + play.wins, 9);
    }
  }

  // ---- haunt event ----------------------------------------------------
  function randomPattern() {
    const btns = ["A", "B", "C"];
    const out = [];
    for (let i = 0; i < 3; i++) out.push(btns[(Math.random() * 3) | 0]);
    return out;
  }

  function startHaunt() {
    mode = "HAUNT";
    haunt = {
      pattern: randomPattern(), showIdx: 0, showTimer: 10,
      phase: "show", step: 0, failTimer: 0, winTimer: 0,
    };
    LCD.setInverted(true);
    const room = document.getElementById("room");
    if (room) room.classList.add("haunting");
    fillGlitch();
    Sound.haunt();
  }

  function exitHaunt() {
    State.calmHaunt();
    LCD.setInverted(false);
    const room = document.getElementById("room");
    if (room) room.classList.remove("haunting");
    const crawl = document.getElementById("glitch-crawl");
    if (crawl) crawl.innerHTML = "";
    goIdle();
  }

  function tickHaunt() {
    if (haunt.phase === "show") {
      haunt.showTimer--;
      if (haunt.showTimer <= 0) {
        haunt.showIdx++;
        haunt.showTimer = 10;
        if (haunt.showIdx >= 3) { haunt.phase = "input"; haunt.step = 0; }
      }
    } else if (haunt.phase === "fail") {
      haunt.failTimer--;
      if (haunt.failTimer <= 0) {
        haunt.phase = "show"; haunt.showIdx = 0; haunt.showTimer = 10;
      }
    } else if (haunt.phase === "win") {
      haunt.winTimer--;
      if (haunt.winTimer <= 0) exitHaunt();
    }
  }

  function drawHaunt() {
    const cells = [4, 12, 20];
    for (let i = 0; i < 3; i++) {
      const cx = cells[i];
      // cell box (6 wide, y4-10)
      for (let x = 0; x < 6; x++) { LCD.on(cx + x, 4); LCD.on(cx + x, 10); }
      for (let y = 4; y <= 10; y++) { LCD.on(cx, y); LCD.on(cx + 5, y); }

      let showLetter = false;
      if (haunt.phase === "show" || haunt.phase === "win") showLetter = true;
      else if (haunt.phase === "input") showLetter = i < haunt.step;
      else if (haunt.phase === "fail") showLetter = true;

      // blink the currently-shown letter during show, and the active input slot
      let blink = false;
      if (haunt.phase === "show" && i === haunt.showIdx) blink = (animFrame % 4 < 2);
      if (haunt.phase === "input" && i === haunt.step) blink = (animFrame % 4 < 2);

      if (showLetter && !blink) LCD.drawText(haunt.pattern[i], cx + 1, 5);
      if (haunt.phase === "input" && i === haunt.step && blink) {
        LCD.drawText("_", cx + 2, 5); // cursor
      }
    }
    if (haunt.phase === "show") LCD.drawTextCentered("WATCH", 12);
    else if (haunt.phase === "input") LCD.drawTextCentered("REPEAT", 12);
    else if (haunt.phase === "fail") LCD.drawTextCentered("NO", 12);
    else if (haunt.phase === "win") LCD.drawTextCentered("CALM", 12);
  }

  function hauntPress(btn) {
    if (!haunt || haunt.phase !== "input") return;
    if (btn === haunt.pattern[haunt.step]) {
      haunt.step++;
      Sound.blip();
      if (haunt.step >= 3) { haunt.phase = "win"; haunt.winTimer = 16; Sound.calm(); }
    } else {
      haunt.phase = "fail"; haunt.failTimer = 12; Sound.lose();
    }
  }

  function fillGlitch() {
    const crawl = document.getElementById("glitch-crawl");
    if (!crawl) return;
    const phrases = ["H̴A̴U̴N̴T̴", "Y̸O̷U̴ ̴L̸E̷F̴T̴ ̴M̶E̸", "1̸0̸0̴1̴1̶0̶", "F̵E̵E̵D̵ ̷M̸E̴",
      "B̸A̷C̴K̴", "R̴E̴M̷E̵M̸B̴E̵R̴", "0̴x̴D̴E̵A̶D̸", "N̴O̸I̴S̶E̷"];
    let html = "";
    for (let i = 0; i < 6; i++) {
      const top = 6 + i * 15 + (Math.random() * 6 | 0);
      const dir = i % 2 ? "" : " animation-delay:0.5s;";
      const txt = phrases[(Math.random() * phrases.length) | 0];
      const dur = 4 + (Math.random() * 4 | 0);
      html += '<div class="line" style="top:' + top + '%;animation-duration:' + dur + 's;' + dir + '">' + txt + '</div>';
    }
    crawl.innerHTML = html;
  }

  // ---- input ----------------------------------------------------------
  function pressA() { route("A"); }
  function pressB() { route("B"); }
  function pressC() { route("C"); }

  function route(btn) {
    // any-button screens
    if (mode === "HATCH") { doHatch(); return; }
    if (mode === "NEGLECT") { dismissNeglect(); return; }
    if (mode === "HAUNT") { hauntPress(btn); Sound.press(); return; }

    if (mode === "PLAY") { playInput(btn); return; }
    if (mode === "STATUS") { statusInput(btn); return; }

    // menu + submenus
    if (mode === "IDLE") { Sound.press(); openMenu(); return; }
    if (mode === "MENU") { menuInput(btn); return; }
    if (mode === "FEED") { feedInput(btn); return; }

    // transient confirm screens: any button advances early
    if (mode === "LIGHT" || mode === "LULLABY" || mode === "EATING") {
      Sound.press(); setMode(modeNext); return;
    }
  }

  function doHatch() {
    State.hatch();
    Sound.hatch();
    bornTimer = 26;
    goIdle();
  }

  function dismissNeglect() {
    State.consumeNeglect();
    if (State.isHaunting()) startHaunt();
    else goIdle();
  }

  function openMenu() { menuIndex = 0; setMode("MENU"); }

  function menuInput(btn) {
    if (btn === "A") { menuIndex = (menuIndex + 1) % MENU_ITEMS.length; Sound.press(); }
    else if (btn === "B") { selectMenu(); }
    else if (btn === "C") { Sound.cancel(); goIdle(); }
  }

  function selectMenu() {
    Sound.select();
    switch (MENU_ITEMS[menuIndex]) {
      case "FEED": feedIndex = 0; setMode("FEED"); break;
      case "PLAY": startPlay(); break;
      case "LIGHT": doLight(); break;
      case "STATUS": statusPage = 0; setMode("STATUS"); break;
      case "LULL": doLullaby(); break;
    }
  }

  function doLight() {
    State.light();
    Sound.light();
    setTransient("LIGHT", 16, "IDLE");
  }

  function doLullaby() {
    State.lullaby();
    Sound.lullaby();
    setTransient("LULLABY", 24, "IDLE");
  }

  function feedInput(btn) {
    if (btn === "A") { feedIndex = (feedIndex + 1) % FEARS.length; Sound.press(); }
    else if (btn === "B") {
      State.feed(FEARS[feedIndex]);
      Sound.feed();
      setTransient("EATING", 16, "IDLE");
    }
    else if (btn === "C") { Sound.cancel(); setMode("MENU"); }
  }

  function statusInput(btn) {
    if (btn === "A") {
      statusPage = (statusPage + 1) % 2;
      Sound.press();
    } else if (btn === "B" || btn === "C") {
      Sound.cancel();
      setMode("MENU");
    }
  }

  function playInput(btn) {
    if (!play) return;
    if (play.phase === "GUESS") {
      if (btn === "A") { play.guess = 0; commitGuess(); }
      else if (btn === "B") { play.guess = 1; commitGuess(); }
      else if (btn === "C") { Sound.cancel(); setMode("MENU"); play = null; }
    } else if (play.phase === "RESULTS") {
      Sound.press();
      play = null;
      setMode("MENU");
    }
  }

  function commitGuess() {
    play.side = (Math.random() * 2) | 0; // 0 = left, 1 = right
    play.phase = "REVEAL";
    play.t = 0;
    Sound.blip();
  }

  return {
    init, tick,
    pressA, pressB, pressC,
    getMode() { return mode; },
  };
})();
