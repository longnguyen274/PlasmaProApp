/* global __dirname, Buffer */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const ts = require('typescript');
const load = (file) => {
  const mod = { exports: {} };
  new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod, mod.exports);
  return mod.exports;
};
const { detectWound, smoothDetection, coverMap } = load('woundDetect.ts');

// Ảnh tổng hợp: da + vết đỏ hình elip lệch tâm, có nhiễu.
function synthetic(w, h, ellipse) {
  const px = new Uint8Array(w * h * 4);
  let seed = 7;
  const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 9) - 4; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const inside = ellipse && ((x - ellipse.cx) / ellipse.rx) ** 2 + ((y - ellipse.cy) / ellipse.ry) ** 2 <= 1;
    const [r, g, b] = inside ? [185, 75, 80] : [232, 192, 168];
    px[i] = r + noise(); px[i + 1] = g + noise(); px[i + 2] = b + noise(); px[i + 3] = 255;
  }
  return px;
}

const e = { cx: 70, cy: 50, rx: 30, ry: 20 };
const found = detectWound(synthetic(120, 160, e), 120, 160);
assert.equal(found.found, true);
assert.ok(Math.abs(found.center.x - 70 / 120) < 0.03, 'center x');
assert.ok(Math.abs(found.center.y - 50 / 160) < 0.03, 'center y');
const expected = Math.PI * e.rx * e.ry / (120 * 160);
assert.ok(Math.abs(found.areaFraction - expected) / expected < 0.1, `area ${found.areaFraction} vs ${expected}`);
assert.ok(found.hull.length >= 8, 'hull outlines the region');
assert.ok(found.contrast > 20);

assert.equal(detectWound(synthetic(120, 160, null), 120, 160).found, false, 'Plain skin has no wound');
assert.equal(detectWound(new Uint8Array(0), 120, 160).found, false);
assert.equal(detectWound(synthetic(120, 160, { cx: 60, cy: 80, rx: 2, ry: 2 }), 120, 160).found, false, 'Specks are ignored');

// Lấp lỗ: lõi tối giữa vết thương vẫn tính vào diện tích.
const holed = synthetic(120, 160, e);
for (let y = 45; y < 55; y++) for (let x = 64; x < 76; x++) { const i = (y * 120 + x) * 4; holed[i] = 90; holed[i + 1] = 70; holed[i + 2] = 70; }
assert.ok(Math.abs(detectWound(holed, 120, 160).areaFraction - expected) / expected < 0.1, 'holes filled');

const a = { ...found, box: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 }, center: { x: 0.3, y: 0.3 } };
const b = { ...found, box: { x: 0.3, y: 0.2, width: 0.2, height: 0.2 }, center: { x: 0.4, y: 0.3 } };
assert.ok(Math.abs(smoothDetection(a, b, 0.5).box.x - 0.25) < 1e-9);
assert.equal(smoothDetection(a, { ...b, center: { x: 0.9, y: 0.9 } }).center.x, 0.9, 'big jump is not blended');

const map = coverMap(300, 400, 300, 300);
assert.deepEqual(map.toView(0.5, 0.5), { x: 150, y: 150 });
assert.equal(map.toView(0, 0).y, -50);

// Ảnh demo trong app (PNG 8-bit, không xen kẽ).
function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const ch = colorType === 6 ? 4 : 3, stride = width * ch, raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(width * height * 4), prev = new Uint8Array(stride), line = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], left = x >= ch ? line[x - ch] : 0, up = prev[x], ul = x >= ch ? prev[x - ch] : 0;
      const p = left + up - ul, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - ul);
      line[x] = (v + [0, left, up, (left + up) >> 1, pa <= pb && pa <= pc ? left : pb <= pc ? up : ul][f]) & 255;
    }
    for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) out[(y * width + x) * 4 + c] = line[x * ch + c];
    prev.set(line);
  }
  return { width, height, data: out };
}
for (let k = 1; k <= 6; k++) {
  const img = decodePng(path.join(__dirname, '../../../assets/demo', `demo_${k}.png`));
  const result = detectWound(img.data, img.width, img.height);
  assert.equal(result.found, true, `demo_${k} wound found`);
  assert.ok(result.areaFraction > 0.02 && result.areaFraction < 0.5, `demo_${k} area ${result.areaFraction}`);
}

console.log('woundDetect: tất cả kiểm thử đạt');
