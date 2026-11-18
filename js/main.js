/* =========================================================================
   main.js — entry point. Wires DOM + keyboard to the game, runs the loop,
   handles the mute toggle, the share link, and the read-only card view.
   ========================================================================= */

(function () {
  "use strict";
  const $ = function (id) { return document.getElementById(id); };

  const canvas = $("lcd");
  if (canvas) LCD.init(canvas);

  // ---- share / card view ---------------------------------------------
  const params = new URLSearchParams(location.search);
  const ghostParam = params.get("ghost");
  const stageParam = params.get("stage");

  function stageNameToKey(s) {
    const map = { WISP: "wisp", SPECTER: "specter", POLTERGEIST: "poltergeist", BANSHEE: "banshee" };
    return map[(s || "").toUpperCase()] || "wisp";
  }

  function renderCardSprite(cv, key) {
    const off = document.createElement("canvas");
    off.width = 32; off.height = 16;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;
    const sp = Sprites[key] || Sprites.wisp;
    const ox = ((32 - sp.w) / 2) | 0;
    const oy = ((16 - sp.h) / 2) | 0;
    const f = sp.frames[0];
    octx.fillStyle = "#8fd86a";
    for (let y = 0; y < sp.h; y++) {
      for (let x = 0; x < sp.w; x++) {
        if (f[y].charAt(x) === "#") octx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a160a";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(off, 0, 0, 32, 16, 0, 0, cv.width, cv.height);
  }

  // If the URL carries a ghost, render the static share card and stop.
  if (ghostParam && stageParam) {
    document.body.classList.add("cardview");
    renderCardSprite($("card-canvas"), stageNameToKey(stageParam));
    $("card-name").textContent = decodeURIComponent(ghostParam).toUpperCase();
    $("card-stage").textContent = decodeURIComponent(stageParam).toUpperCase() + " STAGE";
    return;
  }

  // ---- normal game ----------------------------------------------------
  Game.init();

  // ---- first-visit control hint -------------------------------------
  const hintEl = $("hint");
  const HINT_KEY = "ghostagotchi.hint";
  let hintPresses = 0;
  let hintSeen = false;
  try { hintSeen = localStorage.getItem(HINT_KEY) === "1"; } catch (e) { hintSeen = false; }
  if (hintSeen && hintEl) hintEl.hidden = true;

  function countHintPress() {
    if (!hintEl || hintEl.hidden) return;
    hintPresses++;
    if (hintPresses >= 3) fadeHint();
  }
  function fadeHint() {
    if (!hintEl || hintEl.hidden) return;
    try { localStorage.setItem(HINT_KEY, "1"); } catch (e) { /* ignore */ }
    let done = false;
    function finish() {
      if (done || !hintEl) return;
      done = true;
      hintEl.hidden = true;
    }
    hintEl.addEventListener("transitionend", function ev(ev) {
      if (ev.propertyName !== "opacity") return;
      hintEl.removeEventListener("transitionend", ev);
      finish();
    });
    setTimeout(finish, 700); // fallback if transitionend never fires
    hintEl.classList.add("fading");
  }

  // first user gesture resumes the AudioContext
  let audioUnlocked = false;
  function unlock() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Sound.resume();
  }

  function pulse(el) {
    if (!el) return;
    el.classList.add("pressed");
    setTimeout(function () { el.classList.remove("pressed"); }, 90);
  }

  function bindButton(el, fn) {
    if (!el) return;
    el.addEventListener("click", function () { unlock(); fn(); pulse(el); countHintPress(); });
  }
  bindButton($("btnA"), Game.pressA);
  bindButton($("btnB"), Game.pressB);
  bindButton($("btnC"), Game.pressC);

  window.addEventListener("keydown", function (e) {
    const k = e.key.toLowerCase();
    if (k === "a") { e.preventDefault(); unlock(); Game.pressA(); pulse($("btnA")); countHintPress(); }
    else if (k === "b") { e.preventDefault(); unlock(); Game.pressB(); pulse($("btnB")); countHintPress(); }
    else if (k === "c") { e.preventDefault(); unlock(); Game.pressC(); pulse($("btnC")); countHintPress(); }
    else if (k === "m") { e.preventDefault(); toggleMute(); }
  });

  // ---- mute toggle ----------------------------------------------------
  function syncMuteUI() {
    const muted = Sound.isMuted();
    $("mute").classList.toggle("muted", muted);
    $("mute-label").textContent = muted ? "MUTED" : "SOUND";
  }
  function toggleMute() {
    unlock();
    const muted = Sound.toggle();
    State.setSound(!muted);
    syncMuteUI();
    if (!muted) Sound.press();
  }
  $("mute").addEventListener("click", toggleMute);
  syncMuteUI();

  // ---- share link -----------------------------------------------------
  const shareEl = $("share");
  function shareURL() {
    const p = State.sharePayload();
    if (!p) return "";
    return location.origin + location.pathname +
      "?ghost=" + encodeURIComponent(p.name) +
      "&stage=" + encodeURIComponent(p.stage);
  }
  function updateShare() {
    if (!State.hasGhost()) { shareEl.hidden = true; return; }
    shareEl.hidden = false;
    shareEl.setAttribute("href", shareURL());
  }

  let copiedTimer = null;
  let shareBoxTimer = null;
  function showCopied() {
    shareEl.textContent = "LINK COPIED";
    shareEl.classList.add("copied");
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(function () {
      shareEl.textContent = "SHARE MY GHOST";
      shareEl.classList.remove("copied");
      copiedTimer = null;
    }, 2000);
  }
  function hideShareBox() {
    const box = $("share-box");
    if (box) box.hidden = true;
    if (shareBoxTimer) { clearTimeout(shareBoxTimer); shareBoxTimer = null; }
  }
  function showShareBox(url) {
    const box = $("share-box");
    if (!box) return;
    box.hidden = false;
    const inp = $("share-link");
    if (inp) {
      inp.value = url;
      // focus + select after layout so a tap can copy on mobile
      setTimeout(function () {
        try { inp.focus(); inp.select(); } catch (e) { /* ignore */ }
      }, 0);
    }
    if (shareBoxTimer) clearTimeout(shareBoxTimer);
    shareBoxTimer = setTimeout(hideShareBox, 8000);
  }
  const shareClose = $("share-close");
  if (shareClose) shareClose.addEventListener("click", hideShareBox);

  shareEl.addEventListener("click", function (e) {
    e.preventDefault();
    const url = shareURL();
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showCopied)
        .catch(function () { showShareBox(url); });
    } else {
      showShareBox(url);
    }
  });

  // ---- loop -----------------------------------------------------------
  let ticks = 0;
  setInterval(function () {
    Game.tick();
    ticks++;
    if (ticks % 50 === 0) { State.save(); updateShare(); }
  }, 100);
  updateShare();

  // persist when the tab is hidden or unloaded so away-time is accurate
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) State.save();
  });
  window.addEventListener("pagehide", function () { State.save(); });
})();
