// ---------------------------------------------------------------------------
// AutoSpeechWriter — icon generator
// ---------------------------------------------------------------------------
// Generates the retro-grille microphone icon at multiple sizes:
//   - build/icon.png  (256x256, black interior)  — app / taskbar icon
//   - build/icon.ico  (16,32,48,64,128,256 PNG-based) — Windows .ico
//   - prints 32x32 idle/rec base64 to stdout (for embedding as tray icons)
//
// Run: node gen-icons.js   (or: bun gen-icons.js)
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const T = 0;       // transparent
const WHITE = 1;   // outline + grille slots + stem
const INTERIOR = 2; // black (idle) or red (rec)

// Draw the microphone into a SIZE x SIZE grid, scaled from a 32-unit design.
function drawMic(size, interiorColor) {
  const grid = [];
  for (let y = 0; y < size; y++) grid.push(new Array(size).fill(T));
  const s = size / 32; // scale factor

  const px = (gx, gy, v) => {
    const x = Math.round(gx * s), y = Math.round(gy * s);
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = v;
  };
  const hline = (x0, x1, y, v) => { for (let x = x0; x <= x1; x++) px(x, y, v); };
  const vline = (x, y0, y1, v) => { for (let y = y0; y <= y1; y++) px(x, y, v); };
  const fill = (x0, y0, x1, y1, v) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, v);
  };
  // Make lines 1px-thick at 32 but thicker at large sizes for a bold look.
  const thick = Math.max(1, Math.round(s));

  // --- Head (grille) ---
  // Outer rect: x 9..22, y 4..25
  for (let t = 0; t < thick; t++) {
    hline(9, 22, 4 + t, WHITE);   // top
    hline(9, 22, 25 - t, WHITE);  // bottom
    vline(9 + t, 4, 25, WHITE);   // left
    vline(22 - t, 4, 25, WHITE);  // right
  }
  // Round the top corners.
  px(9, 4, T); px(22, 4, T); px(9, 5, T); px(22, 5, T);
  px(10, 4, WHITE); px(21, 4, WHITE);

  // Interior fill: x 10..21, y 5..24
  fill(10, 5, 21, 24, INTERIOR);

  // Horizontal grille slots (white), 5 of them.
  [8, 12, 16, 20, 24].forEach((gy) => {
    for (let t = 0; t < thick; t++) hline(10, 21, gy + t, WHITE);
  });
  // Re-assert bottom edge in case the last slot overlapped.
  for (let t = 0; t < thick; t++) hline(9, 22, 25 - t, WHITE);

  // --- Stem / handle ---
  fill(14, 26, 17, 30, WHITE);

  return { grid, interiorColor };
}

// ---- PNG encoding (RGBA, 8-bit) ----
const crcTable = (function () {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function gridToPng(size, drawn) {
  const { grid, interiorColor } = drawn;
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const v = grid[y][x];
      if (v === WHITE) raw.push(255, 255, 255, 255);
      else if (v === INTERIOR) raw.push(interiorColor[0], interiorColor[1], interiorColor[2], 255);
      else raw.push(0, 0, 0, 0);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  ihdr[9] = 6;  ihdr[10] = 0;  ihdr[11] = 0;  ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ---- ICO (PNG-based) ----
function buildIco(sizes, interiorColor) {
  const entries = sizes.map((sz) => {
    const png = gridToPng(sz, drawMic(sz, interiorColor));
    return { size: sz, png };
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4); // count
  let offset = 6 + entries.length * 16;
  const dirEntries = entries.map((e) => {
    const b = Buffer.alloc(16);
    b[0] = e.size >= 256 ? 0 : e.size;   // width (0 => 256)
    b[1] = e.size >= 256 ? 0 : e.size;   // height
    b[2] = 0;                            // colors
    b[3] = 0;                            // reserved
    b.writeUInt16LE(1, 4);               // planes
    b.writeUInt16LE(32, 6);              // bpp
    b.writeUInt32LE(e.png.length, 8);    // bytes in res
    b.writeUInt32LE(offset, 12);         // image offset
    offset += e.png.length;
    return b;
  });
  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

// ---- Main ----
const BLACK = [0, 0, 0];
const RED = [228, 38, 38];

const outDir = path.join(__dirname, 'build');
fs.mkdirSync(outDir, { recursive: true });

// App icon (256 PNG, black interior — neutral/idle look).
const png256 = gridToPng(256, drawMic(256, BLACK));
fs.writeFileSync(path.join(outDir, 'icon.png'), png256);

// Windows .ico (multi-size, PNG-based, black interior).
const ico = buildIco([16, 32, 48, 64, 128, 256], BLACK);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);

// Tray icons (32x32) — print base64 for embedding into main.ts.
const idleB64 = gridToPng(32, drawMic(32, BLACK)).toString('base64');
const recB64 = gridToPng(32, drawMic(32, RED)).toString('base64');

console.log('Wrote build/icon.png (256x256) and build/icon.ico');
console.log('IDLE_ICON_B64=' + idleB64);
console.log('REC_ICON_B64=' + recB64);
