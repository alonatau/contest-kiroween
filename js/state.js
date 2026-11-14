/* =========================================================================
   state.js — the ghost: persistence, real-time meter decay, life-cycle
   stages, Haunt rules, and the "you left me" neglect memory.
   Exposes a global `State` object.
   ========================================================================= */

const State = (function () {
  const KEY = "ghostagotchi.v1";
  const SOUND_KEY = "ghostagotchi.sound";
  const DAY = 24 * 60 * 60 * 1000;
  const MIN = 60 * 1000;

  const MAX = 10;                       // meter max
  const DECAY = {                       // ms per point lost
    hunger: 20 * MIN,
    joy: 20 * MIN,
    candle: 30 * MIN,
  };
  const HAUNT_RATE = 10 * MIN;          // 1 Haunt point per 10 min of any meter at 0
  const NEGLECT_MS = 12 * 60 * 60 * 1000; // 12 hours

  const STAGES = [
    { name: "WISP", key: "wisp", min: 0 },
    { name: "SPECTER", key: "specter", min: 1 * DAY },
    { name: "POLTERGEIST", key: "poltergeist", min: 3 * DAY },
    { name: "BANSHEE", key: "banshee", min: 7 * DAY },
  ];

  let ghost = null;
  let neglectPending = false;

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
  }

  function load() {
    const raw = lsGet(KEY);
    if (!raw) { ghost = null; return null; }
    try {
      ghost = JSON.parse(raw);
      if (!ghost || typeof ghost !== "object" || !ghost.born) ghost = null;
    } catch (e) { ghost = null; }
    return ghost;
  }

  function save() {
    if (!ghost) return;
    lsSet(KEY, JSON.stringify(ghost));
  }

  function hasGhost() { return !!ghost; }
  function get() { return ghost; }

  function randomName() {
    return NAMES[(Math.random() * NAMES.length) | 0];
  }

  // Create a freshly hatched ghost.
  function hatch(optName) {
    const now = Date.now();
    ghost = {
      name: optName || randomName(),
      born: now,
      last: now,
      meters: {
        hunger: MAX,
        joy: MAX,
        candle: MAX,
        haunt: 0,
      },
      // so it never re-triggers neglect from the birth instant
      lastSeen: now,
    };
    neglectPending = false;
    save();
    return ghost;
  }

  function ageMs() { return ghost ? Date.now() - ghost.born : 0; }

  function stageIndex() {
    if (!ghost) return 0;
    const a = ageMs();
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) if (a >= STAGES[i].min) idx = i;
    return idx;
  }
  function stageName() { return STAGES[stageIndex()].name; }
  function stageKey() { return STAGES[stageIndex()].key; }

  // Apply real-time decay since `last`. Returns { elapsed, neglect, justHaunted }.
  function applyDecay() {
    if (!ghost) return { elapsed: 0, neglect: false, justHaunted: false };
    const now = Date.now();
    const elapsed = now - ghost.last;
    if (elapsed <= 0) return { elapsed: 0, neglect: false, justHaunted: false };

    const m = ghost.meters;
    const beforeHaunt = m.haunt;

    // Capture the values at the start of the interval (before decay).
    const startH = m.hunger, startJ = m.joy, startC = m.candle;

    // 1) Continuous meter decay (floats, clamped 0..MAX).
    const hLoss = elapsed / DECAY.hunger;
    const jLoss = elapsed / DECAY.joy;
    const cLoss = elapsed / DECAY.candle;
    m.hunger = clamp(startH - hLoss, 0, MAX);
    m.joy = clamp(startJ - jLoss, 0, MAX);
    m.candle = clamp(startC - cLoss, 0, MAX);

    // 2) Haunt rises while any meter is at 0.
    //    Find the earliest moment a decaying meter reached 0 within the
    //    interval; from then on at least one meter is zero.
    let earliestZero = now;
    consider(startH, DECAY.hunger);
    consider(startJ, DECAY.joy);
    consider(startC, DECAY.candle);

    function consider(startVal, rate) {
      if (startVal <= 0) { // already zero when the interval began
        if (ghost.last < earliestZero) earliestZero = ghost.last;
        return;
      }
      // 1 point is lost every `rate` ms, so reaching 0 takes startVal*rate ms.
      const hitAt = ghost.last + startVal * rate;
      if (hitAt < now && hitAt < earliestZero) earliestZero = hitAt;
    }

    if (earliestZero < now) {
      const zeroTime = now - earliestZero;
      m.haunt = clamp(m.haunt + zeroTime / HAUNT_RATE, 0, MAX);
    }

    ghost.last = now;
    const justHaunted = beforeHaunt < MAX && m.haunt >= MAX;

    // Neglect: closed > 12h and any meter ended at 0.
    const neglect = elapsed > NEGLECT_MS && (m.hunger <= 0 || m.joy <= 0 || m.candle <= 0);

    // Note: persistence is handled on a slower cadence by the caller,
    // not here — applyDecay runs ~10x/second.
    return { elapsed, neglect, justHaunted };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // Feed a fear: hunger up. Mondays are a weak fear (a joke), Dark is hearty.
  const FEED = { SPIDERS: 3, DARK: 4, MONDAYS: 2 };
  function feed(fearKey) {
    if (!ghost) return;
    const amt = FEED[fearKey] != null ? FEED[fearKey] : 3;
    ghost.meters.hunger = clamp(ghost.meters.hunger + amt, 0, MAX);
    save();
  }

  function light() {
    if (!ghost) return;
    ghost.meters.candle = clamp(ghost.meters.candle + 5, 0, MAX);
    save();
  }

  function addJoy(n) {
    if (!ghost) return;
    ghost.meters.joy = clamp(ghost.meters.joy + n, 0, MAX);
    save();
  }

  function lullaby() {
    if (!ghost) return;
    ghost.meters.haunt = clamp(ghost.meters.haunt - 3, 0, MAX);
    save();
  }

  // Resolve a haunt event: calm completely.
  function calmHaunt() {
    if (!ghost) return;
    ghost.meters.haunt = 0;
    save();
  }

  function isHaunting() { return ghost && ghost.meters.haunt >= MAX; }

  function setNeglectPending(v) { neglectPending = !!v; }
  function consumeNeglect() {
    const v = neglectPending;
    neglectPending = false;
    return v;
  }

  // Sound preference persists independently so it works pre-hatch.
  function getSound() { return lsGet(SOUND_KEY) !== "0"; } // default on
  function setSound(on) { lsSet(SOUND_KEY, on ? "1" : "0"); }

  // Share payload for the URL.
  function sharePayload() {
    if (!ghost) return null;
    return { name: ghost.name, stage: stageName() };
  }

  // Wipe everything (used by an undocumented "reset" for debugging/dev).
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    ghost = null; neglectPending = false;
  }

  return {
    MAX, STAGES, DAY,
    load, save, hasGhost, get, hatch, randomName,
    ageMs, stageIndex, stageName, stageKey,
    applyDecay,
    feed, light, addJoy, lullaby, calmHaunt,
    isHaunting,
    setNeglectPending, consumeNeglect,
    getSound, setSound,
    sharePayload,
    reset,
  };
})();
