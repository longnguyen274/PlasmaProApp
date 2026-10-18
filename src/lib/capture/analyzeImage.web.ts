import { evaluatePixels, unknownQuality } from './quality';
import { detectWound, type WoundDetection } from './woundDetect';
import type { CaptureQuality, Roi } from './types';

export async function analyzeImage(uri: string, roi: Roi): Promise<CaptureQuality> {
  try {
    const image = new window.Image();
    image.src=uri;
    await image.decode();
    const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=Math.max(4,Math.round(256*image.height/image.width));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx) return unknownQuality();
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return evaluatePixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,roi);
  } catch { return unknownQuality(); }
}


/** Khoanh vết thương trên ảnh đã chụp (thu về 160 px). */
export async function detectInPhoto(uri: string): Promise<WoundDetection | null> {
  try {
    const image = new window.Image();
    image.src = uri;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = Math.max(4, Math.round(160 * image.height / image.width));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return detectWound(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  } catch { return null; }
}
