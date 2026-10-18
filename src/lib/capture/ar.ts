// Dữ liệu từ phiên AR native (ARKit/ARCore). Khoảng cách và chiều sâu là metadata lần chụp,
// chưa phải phép đo diện tích đã kiểm chứng.

export type ARTrackingState = 'normal' | 'limited' | 'not_available';
export type ARHitSource = 'plane' | 'estimated_plane' | 'depth' | 'feature_point';

export interface ARTrackingEvent {
  sessionId: string;
  state: ARTrackingState;
  reason?: string;
  planes: number;
  depthEnabled: boolean;
  centerDistanceM?: number;
  centerSource?: ARHitSource;
  planeNormal?: number[];
  /** Điểm đã đo khoảng cách, chuẩn hóa theo khung xem. */
  focus?: number[];
  /** Hướng nhìn của camera trong hệ tọa độ thế giới AR. */
  cameraForward?: number[];
  /** ARKit: cường độ sáng môi trường (lumen, ~1000 là đủ sáng). */
  ambientIntensity?: number;
  /** ARCore: độ sáng điểm ảnh trung bình 0–1. */
  pixelIntensity?: number;
  /** Khung nhỏ để dò vết thương: RGB/RGBA base64. */
  frame?: { width: number; height: number; channels: number; data: string };
  timestampNs?: number;
}

export interface ARIntrinsics { fx: number; fy: number; cx: number; cy: number; width: number; height: number }

export interface ARCaptureData {
  framework: 'arkit' | 'arcore';
  sessionId: string;
  frameTimestampNs: number;
  trackingState: 'normal';
  /** Ảnh camera gốc được xoay bấy nhiêu độ (chiều kim đồng hồ) trước khi lưu. */
  imageRotationDeg: number;
  /** Nội tham số theo ảnh cảm biến gốc (chưa xoay). */
  sensorIntrinsics: ARIntrinsics;
  /** Nội tham số theo ảnh đã lưu. */
  intrinsics: ARIntrinsics;
  cameraPose: { translation?: number[]; rotation?: number[]; matrix?: number[] };
  viewMatrix: number[];
  projectionMatrix: number[];
  planesTracked: number;
  depthEnabled: boolean;
  centerHit?: { centerDistanceM: number; centerSource: ARHitSource; planeNormal?: number[]; planeType?: string; focus?: number[] };
  cameraForward?: number[];
  ambientIntensity?: number;
  depth?: {
    uri: string; width: number; height: number;
    format: 'uint16_mm_le' | 'float32_m_le'; orientation: 'sensor';
    centerMm?: number; confidenceUri?: string;
  };
}

export interface ARCaptureResult { uri: string; width: number; height: number; ar: ARCaptureData }
export interface ARSessionError { code: string; message: string }

/** Khoảng cách gợi ý khi chụp vết thương; chỉ để hướng dẫn bố cục, chưa phải điều kiện đo. */
export const AR_DISTANCE = { minM: 0.2, maxM: 0.6 } as const;
export const AR_EVENT_MAX_AGE_MS = 1500;

export type ARTone = 'green' | 'amber' | 'red' | 'gray';
export interface ARGuidance { label: string; tone: ARTone; text: string; canCapture: boolean; step: 1 | 2 | 3 }

const LIMITED: Record<string, { label: string; text: string }> = {
  initializing: { label: 'Đang khởi tạo', text: 'Di chuyển máy chậm sang trái, sang phải quanh vùng vết thương để AR nhận bề mặt.' },
  excessive_motion: { label: 'Máy di chuyển nhanh', text: 'Di chuyển chậm lại và giữ máy ổn định.' },
  insufficient_features: { label: 'Thiếu chi tiết', text: 'Lùi máy để thấy thêm vùng da và đồ vật xung quanh, tránh bề mặt trơn một màu.' },
  insufficient_light: { label: 'Thiếu sáng', text: 'Tăng ánh sáng trong phòng rồi quét lại.' },
  relocalizing: { label: 'Đang định vị lại', text: 'Đưa máy về gần vị trí trước khi bị gián đoạn.' },
  interrupted: { label: 'Bị gián đoạn', text: 'Phiên AR bị gián đoạn. Giữ ứng dụng mở và quét lại.' },
  camera_unavailable: { label: 'Camera bận', text: 'Đóng ứng dụng khác đang dùng camera rồi mở lại.' },
};

export function arGuidance(event: ARTrackingEvent | null, receivedAt: number | null, now: number): ARGuidance {
  if (!event || receivedAt === null) return { label: 'Đang mở AR', tone: 'gray', text: 'Đang khởi động phiên AR…', canCapture: false, step: 1 };
  if (now - receivedAt > AR_EVENT_MAX_AGE_MS) return { label: 'Mất tín hiệu', tone: 'red', text: 'Phiên AR không gửi dữ liệu mới. Mở lại camera AR.', canCapture: false, step: 1 };
  if (event.state === 'not_available') return { label: 'Không theo dõi được', tone: 'red', text: 'AR chưa theo dõi được. Mở lại camera AR hoặc dùng camera thường.', canCapture: false, step: 1 };
  if (event.state === 'limited') {
    const known = LIMITED[event.reason ?? ''] ?? { label: 'Theo dõi hạn chế', text: 'Quét chậm quanh vùng vết thương.' };
    return { ...known, tone: 'amber', canCapture: false, step: 1 };
  }
  const d = event.centerDistanceM;
  if (d === undefined || !Number.isFinite(d)) {
    return { label: 'Đang tìm bề mặt', tone: 'amber', text: 'Hướng dấu + vào vết thương, quét chậm đến khi nhận được bề mặt da.', canCapture: true, step: 2 };
  }
  const cm = Math.round(d * 100);
  if (d < AR_DISTANCE.minM) return { label: `Quá gần · ${cm} cm`, tone: 'amber', text: 'Đưa máy ra xa hơn, khoảng 20–60 cm.', canCapture: true, step: 2 };
  if (d > AR_DISTANCE.maxM) return { label: `Quá xa · ${cm} cm`, tone: 'amber', text: 'Đưa máy lại gần vết thương, khoảng 20–60 cm.', canCapture: true, step: 2 };
  return { label: `Sẵn sàng · ${cm} cm`, tone: 'green', text: 'Giữ máy song song với bề mặt vết thương rồi bấm chụp.', canCapture: true, step: 3 };
}

export function distanceSource(source: ARHitSource | undefined) {
  switch (source) {
    case 'plane': return 'ar_plane' as const;
    case 'estimated_plane': return 'ar_estimated_plane' as const;
    case 'depth': return 'ar_depth' as const;
    case 'feature_point': return 'ar_feature_point' as const;
    default: return 'none' as const;
  }
}

export const HIT_SOURCE_LABEL: Record<ARHitSource, string> = {
  plane: 'mặt phẳng AR',
  estimated_plane: 'mặt phẳng ước lượng',
  depth: 'bản đồ chiều sâu',
  feature_point: 'điểm đặc trưng',
};

// ---- Đánh giá trước khi cho chụp ----

export type CheckKey = 'tracking' | 'wound' | 'light' | 'distance' | 'angle';
export interface LiveCheck { key: CheckKey; label: string; ok: boolean | null; detail: string; required: boolean }
export interface CaptureReadiness { checks: LiveCheck[]; ready: boolean; headline: string; tone: ARTone }

export interface WoundSignal { found: boolean; meanLuma: number | null; clippedFraction: number }
export const WOUND_MAX_AGE_MS = 1200;
export const MIN_TILT_COS = 0.8; // khoảng 37°

/** Góc giữa hướng nhìn camera và pháp tuyến bề mặt; 1 là song song hoàn toàn. */
export function tiltCos(forward?: number[], normal?: number[]): number | null {
  if (!forward || !normal || forward.length < 3 || normal.length < 3) return null;
  const f = Math.hypot(forward[0], forward[1], forward[2]), n = Math.hypot(normal[0], normal[1], normal[2]);
  if (!f || !n) return null;
  return Math.abs((forward[0] * normal[0] + forward[1] * normal[1] + forward[2] * normal[2]) / (f * n));
}

export function lightCheck(event: ARTrackingEvent | null, wound: WoundSignal | null): { ok: boolean | null; detail: string } {
  if (event?.ambientIntensity !== undefined && event.ambientIntensity < 350) return { ok: false, detail: 'Phòng thiếu sáng. Bật thêm đèn.' };
  if (event?.pixelIntensity !== undefined && event.pixelIntensity < 0.18) return { ok: false, detail: 'Phòng thiếu sáng. Bật thêm đèn.' };
  if (wound?.found && wound.meanLuma !== null) {
    if (wound.meanLuma < 55) return { ok: false, detail: 'Vết thương quá tối. Chiếu thêm đèn vào vết thương.' };
    if (wound.clippedFraction > 0.12) return { ok: false, detail: 'Vết thương bị chói. Đổi góc hoặc giảm đèn chiếu thẳng.' };
    return { ok: true, detail: 'Đủ sáng' };
  }
  if (event?.ambientIntensity !== undefined || event?.pixelIntensity !== undefined) return { ok: true, detail: 'Đủ sáng' };
  return { ok: null, detail: 'Đang đo độ sáng…' };
}

export function assessCapture(input: {
  ar: boolean;
  tracking: ARTrackingEvent | null; trackingAt: number | null;
  wound: WoundSignal | null; woundAt: number | null;
  now: number;
}): CaptureReadiness {
  const { ar, tracking, now } = input;
  const checks: LiveCheck[] = [];
  const freshWound = input.wound && input.woundAt !== null && now - input.woundAt <= WOUND_MAX_AGE_MS ? input.wound : null;
  if (ar) {
    const g = arGuidance(tracking, input.trackingAt, now);
    const ok = tracking?.state === 'normal' && g.tone !== 'red';
    checks.push({ key: 'tracking', label: 'Theo dõi AR', ok: ok ? true : tracking ? false : null, detail: ok ? 'Ổn định' : g.text, required: true });
  }
  checks.push({
    key: 'wound', label: 'Vết thương', required: true,
    ok: freshWound?.found ? true : input.woundAt === null ? null : false,
    detail: freshWound?.found ? 'Đã khoanh vùng' : 'Hướng camera vào vết thương, giữ toàn bộ vết thương trong khung.',
  });
  const light = lightCheck(ar ? tracking : null, freshWound);
  checks.push({ key: 'light', label: 'Độ sáng', required: true, ...light });
  if (ar) {
    const d = tracking?.state === 'normal' ? tracking.centerDistanceM : undefined;
    const cm = d !== undefined && Number.isFinite(d) ? Math.round(d * 100) : null;
    checks.push({
      key: 'distance', label: 'Khoảng cách', required: true,
      ok: cm === null ? null : d! >= AR_DISTANCE.minM && d! <= AR_DISTANCE.maxM,
      detail: cm === null ? 'Đang đo khoảng cách tới vết thương…'
        : d! < AR_DISTANCE.minM ? `${cm} cm · quá gần, lùi máy ra (20–60 cm)`
        : d! > AR_DISTANCE.maxM ? `${cm} cm · quá xa, đưa máy lại gần (20–60 cm)` : `${cm} cm`,
    });
    const cos = tiltCos(tracking?.cameraForward, tracking?.planeNormal);
    checks.push({
      key: 'angle', label: 'Góc chụp', required: false,
      ok: cos === null ? null : cos >= MIN_TILT_COS,
      detail: cos === null ? 'Chưa nhận được mặt da' : cos >= MIN_TILT_COS ? 'Song song với vết thương' : 'Nghiêng máy cho song song với vết thương',
    });
  } else {
    checks.push({ key: 'distance', label: 'Khoảng cách', required: false, ok: null, detail: 'Cần bản cài có AR để đo' });
  }
  const blocking = checks.find(c => (c.required && c.ok !== true) || (!c.required && c.ok === false));
  const ready = !blocking;
  const failed = checks.some(c => c.ok === false);
  return {
    checks, ready,
    headline: ready ? 'Đạt yêu cầu · có thể chụp' : blocking!.detail,
    tone: ready ? 'green' : failed ? 'amber' : 'gray',
  };
}

// ---- Ước lượng diện tích từ AR ----

export interface AreaEstimate { areaCm2: number; depthM: number; cosTilt: number | null }

/**
 * Mô hình camera lỗ kim: mỗi điểm ảnh ở độ sâu Z phủ (Z/fx)·(Z/fy) m² trên mặt phẳng song song với ảnh;
 * chia thêm cos(góc nghiêng) khi biết pháp tuyến bề mặt. Chỉ là ước lượng chưa kiểm chứng; bác sĩ xác nhận số cuối.
 */
export function estimateAreaCm2(args: {
  areaFraction: number; imageWidth: number; imageHeight: number;
  intrinsics: ARIntrinsics; distanceM: number;
  point: { x: number; y: number };
  planeNormal?: number[]; cameraForward?: number[];
}): AreaEstimate | null {
  const { areaFraction, imageWidth: W, imageHeight: H, intrinsics: k, distanceM } = args;
  if (!(areaFraction > 0) || !(W > 0) || !(H > 0) || !(distanceM > 0) || !(k.fx > 0) || !(k.fy > 0) || !(k.width > 0)) return null;
  const sx = W / k.width, sy = H / k.height;
  const fx = k.fx * sx, fy = k.fy * sy, cx = k.cx * sx, cy = k.cy * sy;
  const rx = (args.point.x * W - cx) / fx, ry = (args.point.y * H - cy) / fy;
  const depthM = distanceM / Math.sqrt(1 + rx * rx + ry * ry);
  const cosTilt = tiltCos(args.cameraForward, args.planeNormal);
  if (cosTilt !== null && cosTilt < 0.5) return null;
  const areaM2 = (areaFraction * W * H * depthM * depthM) / (fx * fy) / (cosTilt ?? 1);
  return { areaCm2: Math.round(areaM2 * 1e4 * 10) / 10, depthM, cosTilt };
}
