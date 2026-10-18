export interface SmallFrame { data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: number }

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// Trình duyệt: đọc thẳng khung từ thẻ video của camera.
export async function grabFrame(_camera: unknown): Promise<SmallFrame | null> {
  const video = document.querySelector('video');
  if (!video || video.readyState < 2 || !video.videoWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = Math.round(120 * video.videoHeight / video.videoWidth);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // Camera trước/webcam được hiển thị lật gương; lật khung theo đúng hình người dùng thấy.
  const transform = getComputedStyle(video).transform;
  const mirrored = transform.startsWith('matrix(-1') || transform.startsWith('matrix3d(-1');
  if (mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height, channels: 4 };
}
