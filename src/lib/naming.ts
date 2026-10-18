// Quy ước tên ảnh theo đặc tả mục 4.3:
// <ma_benh_nhan>_<ma_vet_thuong>_<ma_anh>_area_<dien_tich>_cm2.<duoi_tep>

export type AreaUnit = 'cm2' | 'mm2';

export type AreaParse =
  | { ok: true; value: number; needsZeroConfirm: boolean }
  | { ok: false; error: string };

const NUMBER_RE = /^\d+(\.\d+)?$/;

/** Nhận "12,5" hoặc "12.5", quy đổi về cm², chặn số âm và giá trị không phải số. */
export function parseArea(input: string, unit: AreaUnit = 'cm2'): AreaParse {
  const raw = input.trim().replace(',', '.');
  if (raw === '') return { ok: false, error: 'Chưa nhập diện tích.' };
  if (raw.startsWith('-')) return { ok: false, error: 'Diện tích không được là số âm.' };
  if (!NUMBER_RE.test(raw)) return { ok: false, error: 'Diện tích phải là số, ví dụ 12,5.' };
  const parsed = Number(raw);
  // mm² → cm²: chia 100 (1 cm² = 100 mm²), quy đổi giá trị chứ không chỉ đổi nhãn đơn vị.
  const value = roundArea(unit === 'mm2' ? parsed / 100 : parsed);
  return { ok: true, value, needsZeroConfirm: value === 0 };
}

export function roundArea(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** 12 → "12.0", 12.5 → "12.5", 12.345 → "12.345": luôn có phần thập phân, dùng dấu chấm. */
export function formatAreaForName(v: number): string {
  const s = String(roundArea(v));
  return s.includes('.') ? s : `${s}.0`;
}

/** Hiển thị cho người Việt: 12,5 cm². */
export function formatAreaDisplay(v: number | null): string {
  if (v === null) return 'Chưa có nhãn diện tích';
  return `${formatAreaForName(v).replace('.', ',')} cm²`;
}

export function buildFilename(
  patientCode: string,
  woundCode: string,
  imageId: string,
  area: number | null,
  ext: string,
): string {
  if (area === null) return `${patientCode}_${woundCode}_${imageId}.${ext}`;
  return `${patientCode}_${woundCode}_${imageId}_area_${formatAreaForName(area)}_cm2.${ext}`;
}

export type FilenameCheck =
  | { ok: true; area: number; needsZeroConfirm: boolean }
  | { ok: false; error: string };

/**
 * Kiểm tra tên đầy đủ do bác sĩ sửa tay. Phần mã bệnh nhân, mã vết thương, mã ảnh
 * và đuôi tệp phải giữ nguyên; chỉ phần diện tích được thay đổi.
 */
export function checkFullFilename(
  name: string,
  expected: { patientCode: string; woundCode: string; imageId: string; ext: string },
): FilenameCheck {
  const n = name.trim();
  const prefix = `${expected.patientCode}_${expected.woundCode}_${expected.imageId}_`;
  if (!n.startsWith(prefix)) {
    return { ok: false, error: `Tên phải bắt đầu bằng "${prefix}" (mã bệnh nhân, mã vết thương, mã ảnh giữ nguyên).` };
  }
  const extPart = `.${expected.ext}`;
  if (!n.toLowerCase().endsWith(extPart.toLowerCase())) {
    return { ok: false, error: `Phải giữ đuôi tệp "${extPart}"; không đổi định dạng ảnh khi chỉ sửa tên.` };
  }
  const middle = n.slice(prefix.length, n.length - extPart.length);
  if (!middle.startsWith('area_')) return { ok: false, error: 'Thiếu phần "area_<diện tích>".' };
  if (!middle.endsWith('_cm2')) return { ok: false, error: 'Thiếu đơn vị "_cm2" sau diện tích.' };
  const num = middle.slice('area_'.length, middle.length - '_cm2'.length);
  const parsed = parseArea(num, 'cm2');
  if (!parsed.ok) return { ok: false, error: `Phần diện tích không hợp lệ: ${parsed.error}` };
  return { ok: true, area: parsed.value, needsZeroConfirm: parsed.needsZeroConfirm };
}

export function extFromUri(uri: string, mime?: string | null): 'jpg' | 'jpeg' | 'png' | 'heic' | 'webp' {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('heic') || m.includes('heif')) return 'heic';
  if (m.includes('webp')) return 'webp';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  const clean = uri.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'png';
  if (clean.endsWith('.heic') || clean.endsWith('.heif')) return 'heic';
  if (clean.endsWith('.webp')) return 'webp';
  if (clean.endsWith('.jpeg')) return 'jpeg';
  return 'jpg';
}

/**
 * Chia train/validation/test theo bệnh nhân (đặc tả mục 5.2): mọi ảnh của một bệnh nhân
 * nằm cùng một tập. Băm ổn định theo mã bệnh nhân nên chạy lại vẫn ra cùng kết quả.
 */
export function splitForPatient(patientCode: string): 'train' | 'val' | 'test' {
  let h = 2166136261;
  for (let i = 0; i < patientCode.length; i++) {
    h ^= patientCode.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const bucket = h % 10;
  if (bucket < 7) return 'train';
  if (bucket < 9) return 'val';
  return 'test';
}
