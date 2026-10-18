import { evaluatePixels } from './quality';
import { frameQuiet, type SteadySample } from './steady';

export function observeSteady(onSample: (sample: SteadySample) => void): () => void {
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let previous: Uint8ClampedArray | null = null, lastTime = -1;
  const report = (quiet: boolean | null, reason: string) => onSample({ quiet, reason, at: Date.now(), source: 'preview_frames' });
  const timer = setInterval(() => {
    const video = document.querySelector('video');
    if (document.hidden || !context || !video || video.paused || video.readyState < 4 || video.currentTime === lastTime || !video.videoWidth) {
      previous = null; report(null, 'Đang chờ hình ảnh mới từ camera.'); return;
    }
    lastTime = video.currentTime;
    try {
      context.drawImage(video, video.videoWidth * .15, video.videoHeight * .15, video.videoWidth * .7, video.videoHeight * .7, 0, 0, 96, 96);
      const pixels = context.getImageData(0, 0, 96, 96).data;
      const quality = evaluatePixels(pixels, 96, 96, { x: 0, y: 0, width: 1, height: 1 });
      const quiet = frameQuiet(previous, pixels); previous = pixels;
      if (quality.lighting === 'warn' || quality.sharpness === 'warn') { report(false, quality.warnings[0] || 'Kiểm tra lại ánh sáng và chi tiết trong vùng chụp.'); return; }
      report(quiet, quiet === null ? 'Đang theo dõi vùng giữa ảnh…' : quiet ? 'Giữ máy và vùng chụp đứng yên.' : 'Hình ảnh đang thay đổi. Giữ yên để đếm lại.');
    } catch { previous = null; report(null, 'Chưa phân tích được camera. Bạn vẫn có thể chụp tay.'); }
  }, 250);
  return () => clearInterval(timer);
}
