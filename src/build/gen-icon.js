"use strict";

/**
 * Erzeugt das App-Icon ohne externe Tools (nur Node + zlib):
 *  - assets/icon.png  (256×256)
 *  - assets/icon.ico  (Multi-Size: 16/24/32/48/64/128/256, PNG-komprimiert)
 *
 * Motiv: dunkles, abgerundetes Quadrat (passend zum Dark-Theme) mit einem
 * orangefarbenen Runden-Ring (Backyard-Loop) und einem weißen Läufer-Punkt.
 *
 * Aufruf:  node build/gen-icon.js
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ACCENT = [0xfc, 0x52, 0x00];
const ACCENT2 = [0xff, 0x8a, 0x4c];
const BG_TOP = [0x1c, 0x22, 0x30];
const BG_BOTTOM = [0x0e, 0x11, 0x16];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

/** Weiche Kante: 1 innerhalb, 0 außerhalb, lineares Feather von ~1px. */
function edge(d) {
  return clamp(0.5 - d, 0, 1);
}

/** Zeichnet das Icon in einen RGBA-Buffer der Kantenlänge S. */
function draw(S) {
  const buf = Buffer.alloc(S * S * 4);
  const cx = S / 2;
  const cy = S / 2;

  const margin = S * 0.02;
  const half = S / 2 - margin;
  const corner = S * 0.22;

  const ringR = S * 0.31;
  const ringT = S * 0.09;
  const dotR = S * 0.082;
  // Läufer-Punkt oben auf dem Ring (12 Uhr).
  const dotX = cx;
  const dotY = cy - ringR;

  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Abgerundetes Quadrat (signed distance).
      const qx = Math.abs(px - cx) - half + corner;
      const qy = Math.abs(py - cy) - half + corner;
      const outside =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        corner;
      let a = edge(outside);

      // Hintergrund-Verlauf (oben -> unten).
      const t = clamp(py / S, 0, 1);
      let col = mix(BG_TOP, BG_BOTTOM, t);

      // Orangefarbener Ring (Verlauf über die Höhe für etwas Tiefe).
      const dist = Math.hypot(px - cx, py - cy);
      const ringCov = edge(Math.abs(dist - ringR) - ringT / 2);
      if (ringCov > 0) {
        const rcol = mix(ACCENT, ACCENT2, clamp((py - (cy - ringR)) / (2 * ringR), 0, 1));
        col = mix(col, rcol, ringCov);
        a = Math.max(a, ringCov);
      }

      // Weißer Läufer-Punkt mit dunklem Rand für Kontrast.
      const dDot = Math.hypot(px - dotX, py - dotY);
      const dotEdge = edge(dDot - dotR);
      const dotRim = edge(dDot - (dotR + S * 0.018));
      if (dotRim > 0) {
        col = mix(col, BG_BOTTOM, dotRim);
        a = Math.max(a, dotRim);
      }
      if (dotEdge > 0) {
        col = mix(col, [255, 255, 255], dotEdge);
        a = Math.max(a, dotEdge);
      }

      const o = (y * S + x) * 4;
      buf[o] = col[0];
      buf[o + 1] = col[1];
      buf[o + 2] = col[2];
      buf[o + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  }
  return buf;
}

// --- PNG-Encoder ----------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(rgba, S) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = S * 4;
  const raw = Buffer.alloc((stride + 1) * S);
  for (let y = 0; y < S; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// --- ICO-Encoder (PNG-komprimierte Einträge) ------------------------------

function encodeIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const datas = [];
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bit count
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
    datas.push(e.png);
  });

  return Buffer.concat([header, dir, ...datas]);
}

// --- main ------------------------------------------------------------------

const assetsDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(assetsDir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 128, 256];
const entries = sizes.map((size) => ({ size, png: encodePng(draw(size), size) }));

fs.writeFileSync(path.join(assetsDir, "icon.png"), encodePng(draw(256), 256));
fs.writeFileSync(path.join(assetsDir, "icon.ico"), encodeIco(entries));

console.log("icon.png + icon.ico erstellt in", assetsDir);
