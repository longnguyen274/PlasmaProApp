import { useEffect } from 'react';
import { DEFAULT_ROI, evaluatePixels, unknownQuality } from '@/lib/capture/quality';
import type { CaptureQuality } from '@/lib/capture/types';

// Preview-only guidance; saved-image quality is always recomputed on its own pixels.
export function LiveCameraQuality({ active, onQuality }: { active: boolean; onQuality: (quality: CaptureQuality) => void }) {
  useEffect(() => {
    if(!active) return;
    const timer=setInterval(()=>{
      const video=document.querySelector('video');
      if(!video || video.readyState<2 || !video.videoWidth) return;
      try {
        const canvas=document.createElement('canvas');canvas.width=256;canvas.height=Math.round(256*video.videoHeight/video.videoWidth);
        const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx) return;
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        onQuality(evaluatePixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,DEFAULT_ROI));
      } catch { onQuality(unknownQuality()); }
    },1000);
    return ()=>clearInterval(timer);
  },[active,onQuality]);
  return null;
}

