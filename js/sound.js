/* =========================================================================
   sound.js — tiny square-wave beeps via WebAudio.
   The AudioContext is created lazily on the first user gesture (autoplay
   policy). When muted, every call is a silent no-op.
   Exposes a global `Sound` object.
   ========================================================================= */

const Sound = (function () {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // One square-wave tone at `freq` Hz for `dur` seconds.
  function tone(freq, dur, when, vol) {
    const c = ensure();
    if (!c) return;
    const t0 = (when === undefined ? c.currentTime : when);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const v = vol === undefined ? 0.08 : vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(v, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  }

  function press() { tone(660, 0.05, undefined, 0.06); }
  function select() { tone(880, 0.06, undefined, 0.07); }
  function cancel() { tone(330, 0.06, undefined, 0.06); }
  function blip() { tone(740, 0.04, undefined, 0.06); }

  function feed() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(523, 0.06, t0, 0.07);
    tone(659, 0.06, t0 + 0.07, 0.07);
  }

  function light() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(784, 0.05, t0, 0.07);
    tone(988, 0.08, t0 + 0.06, 0.07);
  }

  function lullaby() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(523, 0.12, t0, 0.06);
    tone(659, 0.12, t0 + 0.13, 0.06);
    tone(784, 0.18, t0 + 0.26, 0.06);
  }

  function win() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(659, 0.06, t0, 0.07);
    tone(880, 0.10, t0 + 0.07, 0.07);
  }

  function lose() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(220, 0.10, t0, 0.07);
    tone(165, 0.16, t0 + 0.11, 0.07);
  }

  function hatch() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    // a cracking then rising arpeggio
    tone(196, 0.08, t0, 0.08);
    tone(294, 0.08, t0 + 0.09, 0.08);
    tone(440, 0.08, t0 + 0.18, 0.08);
    tone(659, 0.20, t0 + 0.27, 0.09);
  }

  function haunt() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    // low dissonant drone + wobble
    tone(110, 0.5, t0, 0.09);
    tone(110.7, 0.5, t0, 0.06); // slightly detuned for beating
    tone(220, 0.18, t0 + 0.30, 0.07);
  }

  function calm() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime;
    tone(440, 0.12, t0, 0.07);
    tone(587, 0.12, t0 + 0.13, 0.07);
    tone(880, 0.20, t0 + 0.26, 0.07);
  }

  function isMuted() { return muted; }
  function setMuted(v) { muted = !!v; }
  function toggle() { muted = !muted; return muted; }
  // Resume/create the context on a user gesture without playing a tone.
  function resume() { ensure(); }

  return {
    press, select, cancel, blip,
    feed, light, lullaby, win, lose, hatch, haunt, calm,
    isMuted, setMuted, toggle, resume,
  };
})();
