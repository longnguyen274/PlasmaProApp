// Dò vùng vết thương theo màu: vết thương (mô hạt, chảy máu) đỏ hơn vùng da xung quanh trên kênh a* (CIELAB).
// Đây là bộ dò thử nghiệm để khoanh và bám theo vết thương khi quay, không phải mô hình phân đoạn đã huấn luyện.

export const DETECTOR_ID = 'color_lab_otsu_v1';

export interface WoundDetection {
  found: boolean;
  /** Hộp bao, chuẩn hóa 0–1 theo ảnh được phân tích. */
  box: { x: number; y: number; width: number; height: number } | null;
  /** Đa giác bao lồi của vùng, chuẩn hóa 0–1. */
  hull: [number, number][];
  center: { x: number; y: number } | null;
  /** Tỉ lệ điểm ảnh thuộc vết thương trên toàn ảnh (đã lấp lỗ). */
  areaFraction: number;
  /** Chênh lệch a* trung bình giữa vết thương và nền. */
  contrast: number;
  /** Độ sáng trung bình trong vùng vết thương (0–255). */
  meanLuma: number | null;
  /** Tỉ lệ điểm ảnh cháy sáng trong vùng vết thương. */
  clippedFraction: number;
  width: number;
  height: number;
  reason?: 'no_contrast' | 'no_region' | 'too_small' | 'too_large' | 'empty';
}

const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const labF = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

const empty = (width: number, height: number, reason: WoundDetection['reason']): WoundDetection => ({
  found: false, box: null, hull: [], center: null, areaFraction: 0, contrast: 0, meanLuma: null, clippedFraction: 0, width, height, reason,
});

export function detectWound(pixels: ArrayLike<number>, width: number, height: number, channels = 4): WoundDetection {
  const n = width * height;
  if (width < 8 || height < 8 || pixels.length < n * channels) return empty(width, height, 'empty');

  const a = new Float32Array(n);
  const luma = new Uint8Array(n);
  let min = Infinity, max = -Infinity;
  for (let i = 0, p = 0; i < n; i++, p += channels) {
    const r8 = pixels[p], g8 = pixels[p + 1], b8 = pixels[p + 2];
    const r = LINEAR[r8], g = LINEAR[g8], b = LINEAR[b8];
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const value = 500 * (labF(x) - labF(y));
    a[i] = value;
    if (value < min) min = value;
    if (value > max) max = value;
    luma[i] = Math.round(0.299 * r8 + 0.587 * g8 + 0.114 * b8);
  }
  if (!(max - min > 4)) return empty(width, height, 'no_contrast');

  // Otsu trên a*.
  const bins = 128, hist = new Uint32Array(bins), scale = (bins - 1) / (max - min);
  for (let i = 0; i < n; i++) hist[Math.round((a[i] - min) * scale)]++;
  let total = 0;
  for (let i = 0; i < bins; i++) total += i * hist[i];
  let sumB = 0, wB = 0, best = -1, threshold = 0;
  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (total - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  const cut = min + (threshold + 0.5) / scale;

  let mask: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = a[i] > cut ? 1 : 0;
  mask = morph(mask, width, height, false);
  mask = morph(mask, width, height, true);

  // Thành phần liên thông, chọn vùng lớn và gần giữa khung.
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let bestScore = 0, bestId = -1, components = 0;
  const comps: { count: number; minX: number; minY: number; maxX: number; maxY: number }[] = [];
  for (let start = 0; start < n; start++) {
    if (!mask[start] || label[start] >= 0) continue;
    const id = components++;
    let top = 0, count = 0, sx = 0, sy = 0, minX = width, minY = height, maxX = 0, maxY = 0;
    stack[top++] = start; label[start] = id;
    while (top) {
      const i = stack[--top], x = i % width, y = (i / width) | 0;
      count++; sx += x; sy += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && mask[i - 1] && label[i - 1] < 0) { label[i - 1] = id; stack[top++] = i - 1; }
      if (x < width - 1 && mask[i + 1] && label[i + 1] < 0) { label[i + 1] = id; stack[top++] = i + 1; }
      if (y > 0 && mask[i - width] && label[i - width] < 0) { label[i - width] = id; stack[top++] = i - width; }
      if (y < height - 1 && mask[i + width] && label[i + width] < 0) { label[i + width] = id; stack[top++] = i + width; }
    }
    comps.push({ count, minX, minY, maxX, maxY });
    const spansFrame = maxX - minX >= width * 0.95 && maxY - minY >= height * 0.95;
    if (count < n * 0.003 || spansFrame) continue;
    const dx = sx / count / width - 0.5, dy = sy / count / height - 0.5;
    const score = count * (1 - Math.min(0.8, Math.hypot(dx, dy) * 1.2));
    if (score > bestScore) { bestScore = score; bestId = id; }
  }
  if (bestId < 0) return empty(width, height, components ? 'too_small' : 'no_region');
  const comp = comps[bestId];
  if (comp.count > n * 0.65) return empty(width, height, 'too_large');

  // Lấp lỗ: điểm không thuộc vùng và không nối được ra mép ảnh.
  const outside = new Uint8Array(n);
  let top = 0;
  const pushOutside = (i: number) => { if (label[i] !== bestId && !outside[i]) { outside[i] = 1; stack[top++] = i; } };
  for (let x = 0; x < width; x++) { pushOutside(x); pushOutside((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { pushOutside(y * width); pushOutside(y * width + width - 1); }
  while (top) {
    const i = stack[--top], x = i % width;
    if (x > 0) pushOutside(i - 1);
    if (x < width - 1) pushOutside(i + 1);
    if (i >= width) pushOutside(i - width);
    if (i < n - width) pushOutside(i + width);
  }

  let count = 0, sumA = 0, sumBg = 0, bgCount = 0, sumLuma = 0, clipped = 0;
  const boundary: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (outside[i]) { sumBg += a[i]; bgCount++; continue; }
    count++; sumA += a[i]; sumLuma += luma[i];
    if (luma[i] >= 250) clipped++;
    const x = i % width, y = (i / width) | 0;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || outside[i - 1] || outside[i + 1] || outside[i - width] || outside[i + width]) {
      boundary.push([x, y]);
    }
  }
  const contrast = sumA / count - (bgCount ? sumBg / bgCount : 0);
  if (contrast < 8) return { ...empty(width, height, 'no_contrast'), contrast };

  const hull = convexHull(boundary).map(([x, y]) => [(x + 0.5) / width, (y + 0.5) / height] as [number, number]);
  return {
    found: true,
    box: { x: comp.minX / width, y: comp.minY / height, width: (comp.maxX - comp.minX + 1) / width, height: (comp.maxY - comp.minY + 1) / height },
    hull,
    center: { x: (comp.minX + comp.maxX + 1) / 2 / width, y: (comp.minY + comp.maxY + 1) / 2 / height },
    areaFraction: count / n,
    contrast,
    meanLuma: sumLuma / count,
    clippedFraction: clipped / count,
    width,
    height,
  };
}

// Co (erode) hoặc giãn (dilate) 3×3.
function morph(src: Uint8Array, width: number, height: number, dilate: boolean): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let any = false, all = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < width && yy < height && src[yy * width + xx]) any = true;
          else all = false;
        }
      }
      out[y * width + x] = (dilate ? any : all) ? 1 : 0;
    }
  }
  return out;
}

function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points.slice();
  const sorted = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: [number, number], p: [number, number], q: [number, number]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Làm mượt vị trí giữa các lần dò để khung bám theo vết thương không bị giật. */
export function smoothDetection(previous: WoundDetection | null, next: WoundDetection, alpha = 0.55): WoundDetection {
  if (!previous?.found || !next.found || !previous.box || !next.box || !previous.center || !next.center) return next;
  const mix = (p: number, q: number) => p + (q - p) * alpha;
  // Vết thương khác hẳn (nhảy xa) thì không trộn.
  if (Math.hypot(previous.center.x - next.center.x, previous.center.y - next.center.y) > 0.25) return next;
  const box = { x: mix(previous.box.x, next.box.x), y: mix(previous.box.y, next.box.y), width: mix(previous.box.width, next.box.width), height: mix(previous.box.height, next.box.height) };
  return { ...next, box, center: { x: box.x + box.width / 2, y: box.y + box.height / 2 } };
}

/** Ảnh nguồn hiển thị kiểu "cover" trong khung xem; đổi tọa độ chuẩn hóa của ảnh sang tọa độ khung xem. */
export function coverMap(imageW: number, imageH: number, viewW: number, viewH: number) {
  const s = Math.max(viewW / imageW, viewH / imageH);
  const ox = (viewW - imageW * s) / 2, oy = (viewH - imageH * s) / 2;
  return {
    toView: (nx: number, ny: number) => ({ x: ox + nx * imageW * s, y: oy + ny * imageH * s }),
    toViewNormalized: (nx: number, ny: number) => ({ x: (ox + nx * imageW * s) / viewW, y: (oy + ny * imageH * s) / viewH }),
  };
}
