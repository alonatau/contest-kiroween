/* =========================================================================
   lcd.js — the haunted LCD renderer.
   - 32x16 logical pixels, scaled crisp via CSS (image-rendering: pixelated).
   - Per-pixel ghosting: a turned-off pixel fades to black over 4 frames.
   - Random 1-frame flicker (a brief dim) for the dying-LCD feel.
   - Optional inversion (haunt): lit pixels go dark, the field goes bright.
   - Helpers to draw sprites and 3x5 dot-matrix text.
   Exposes a global `LCD` object.
   ========================================================================= */

const LCD = (function () {
  const W = 32;
  const H = 16;

  let canvas, ctx, img;
  let target = new Uint8Array(W * H); // 0/1 — what the game drew this frame
  let level = new Float32Array(W * H); // 0..1 — actual rendered intensity

  // LCD palette (matches style.css --lcd-on / --lcd-off).
  const ON = [0x8f, 0xd8, 0x6a];   // sickly green
  const OFF = [0x0a, 0x16, 0x0a];  // dark LCD glass

  let inverted = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    img = ctx.createImageData(W, H);
    // pre-fill alpha
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    target.fill(0);
    level.fill(0);
  }

  function inBounds(x, y) {
    return x >= 0 && x < W && y >= 0 && y < H;
  }

  function clear() {
    target.fill(0);
  }

  function on(x, y) {
    x |= 0; y |= 0;
    if (inBounds(x, y)) target[y * W + x] = 1;
  }

  function off(x, y) {
    x |= 0; y |= 0;
    if (inBounds(x, y)) target[y * W + x] = 0;
  }

  function setInverted(v) { inverted = !!v; }
  function isInverted() { return inverted; }

  // Blit a sprite frame at (ox, oy). frame defaults to 0.
  function drawSprite(sprite, ox, oy, frame) {
    if (!sprite) return;
    const f = sprite.frames[frame | 0] || sprite.frames[0];
    for (let y = 0; y < sprite.h; y++) {
      const row = f[y];
      for (let x = 0; x < sprite.w; x++) {
        if (row.charCodeAt(x) === 35) { // '#'
          const px = ox + x, py = oy + y;
          if (inBounds(px, py)) target[py * W + px] = 1;
        }
      }
    }
  }

  // Center a sprite in the LCD, optionally nudged by (dx, dy).
  function drawSpriteCentered(sprite, frame, dx, dy) {
    dx = dx || 0; dy = dy || 0;
    const ox = ((W - sprite.w) >> 1) + dx;
    const oy = ((H - sprite.h) >> 1) + dy;
    drawSprite(sprite, ox, oy, frame);
  }

  function drawChar(ch, x, y) {
    const g = Font.glyphs[ch];
    if (!g) return;
    for (let r = 0; r < 5; r++) {
      const row = g[r];
      for (let c = 0; c < 3; c++) {
        if (row.charCodeAt(c) === 35) {
          const px = x + c, py = y + r;
          if (inBounds(px, py)) target[py * W + px] = 1;
        }
      }
    }
  }

  function textWidth(str) {
    return Math.max(0, str.length * Font.advance - 1);
  }

  function drawText(str, x, y) {
    for (let i = 0; i < str.length; i++) {
      drawChar(str[i], x + i * Font.advance, y);
    }
  }

  function drawTextCentered(str, y) {
    const w = textWidth(str);
    drawText(str, Math.max(0, ((W - w) >> 1)), y);
  }

  // Horizontal bar: outline + fill from the left, value/max of the width.
  function drawHBar(x, y, w, value, max) {
    if (w < 3) return;
    // outline
    for (let i = 0; i < w; i++) { on(x + i, y); on(x + i, y + 2); }
    on(x, y + 1); on(x + w - 1, y + 1);
    // fill (interior width = w-2)
    const inner = w - 2;
    const filled = Math.round((Math.max(0, Math.min(max, value)) / max) * inner);
    for (let i = 0; i < filled; i++) on(x + 1 + i, y + 1);
  }

  // Vertical bar: outline + fill from the bottom, value/max of the height.
  function drawVBar(x, y, w, h, value, max) {
    if (h < 3) return;
    // outline
    for (let j = 0; j < h; j++) { on(x, y + j); on(x + w - 1, y + j); }
    for (let i = 0; i < w; i++) { on(x + i, y); on(x + i, y + h - 1); }
    // fill (interior height = h-2)
    const inner = h - 2;
    const filled = Math.round((Math.max(0, Math.min(max, value)) / max) * inner);
    for (let j = 0; j < filled; j++) {
      for (let i = 1; i < w - 1; i++) on(x + i, y + h - 2 - j);
    }
  }

  // Advance the simulation one frame and paint the canvas.
  function render() {
    // Ghosting: lit pixels snap to full; unlit pixels fade out over 4 frames.
    for (let i = 0; i < target.length; i++) {
      if (target[i]) level[i] = 1;
      else level[i] = Math.max(0, level[i] - 0.25);
    }

    // Random 1-frame flicker: a brief global dim, ~6% of frames.
    let dim = 1;
    if (Math.random() < 0.06) dim = 0.55;

    const data = img.data;
    let o = 0;
    for (let i = 0; i < level.length; i++) {
      let lv = level[i] * dim;
      let r, g, b;
      if (!inverted) {
        r = (ON[0] * lv + OFF[0] * (1 - lv)) | 0;
        g = (ON[1] * lv + OFF[1] * (1 - lv)) | 0;
        b = (ON[2] * lv + OFF[2] * (1 - lv)) | 0;
      } else {
        // Invert: a "lit" pixel becomes dark, the field becomes bright.
        r = (OFF[0] * lv + ON[0] * (1 - lv)) | 0;
        g = (OFF[1] * lv + ON[1] * (1 - lv)) | 0;
        b = (OFF[2] * lv + ON[2] * (1 - lv)) | 0;
      }
      data[o] = r; data[o + 1] = g; data[o + 2] = b; o += 4;
    }
    ctx.putImageData(img, 0, 0);
  }

  return {
    W, H,
    init, clear, on, off,
    drawSprite, drawSpriteCentered,
    drawChar, drawText, drawTextCentered, textWidth,
    drawHBar, drawVBar,
    setInverted, isInverted,
    render,
  };
})();
