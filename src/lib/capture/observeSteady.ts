import { DeviceMotion } from 'expo-sensors';
import { phoneQuiet, type SteadySample } from './steady';

export function observeSteady(onSample: (sample: SteadySample) => void): () => void {
  let cancelled = false;
  let subscription: { remove(): void } | undefined;
  let lastTimestamp: number | undefined;
  const report = (quiet: boolean | null, reason: string) => { if (!cancelled) onSample({ quiet, reason, at: Date.now(), source: 'device_motion' }); };
  void (async () => {
    try {
      if (!await DeviceMotion.isAvailableAsync()) { report(null, 'Máy chưa có cảm biến phù hợp. Bạn vẫn có thể chụp tay.'); return; }
      if (cancelled) return;
      if (!(await DeviceMotion.requestPermissionsAsync()).granted) { report(null, 'Chưa có quyền chuyển động. Bạn vẫn có thể chụp tay.'); return; }
      if (cancelled) return;
      DeviceMotion.setUpdateInterval(200);
      subscription = DeviceMotion.addListener(value => {
        const timestamp = value.acceleration?.timestamp;
        if (timestamp === undefined || !Number.isFinite(timestamp) || (lastTimestamp !== undefined && timestamp <= lastTimestamp)) return;
        lastTimestamp = timestamp;
        const quiet = phoneQuiet(value.acceleration, value.rotationRate);
        report(quiet, quiet === null ? 'Chưa có đủ dữ liệu chuyển động.' : quiet ? 'Giữ máy và vùng chụp đứng yên.' : 'Máy đang di chuyển. Giữ yên để đếm lại.');
      });
    } catch { report(null, 'Chưa đọc được cảm biến. Bạn vẫn có thể chụp tay.'); }
  })();
  return () => { cancelled = true; subscription?.remove(); };
}
