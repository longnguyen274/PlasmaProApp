export async function waitForFrame(): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const video = document.querySelector('video');
    if (video?.paused && video.srcObject) void video.play().catch(() => {});
    if (video && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && !video.paused) return;
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error('Camera chưa nhận được hình ảnh. Giữ máy ổn định và thử chụp lại.');
}
