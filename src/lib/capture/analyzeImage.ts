import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { evaluatePixels, unknownQuality } from './quality';
import { detectWound, type WoundDetection } from './woundDetect';
import type { CaptureQuality, Roi } from './types';

export async function analyzeImage(uri: string, roi: Roi): Promise<CaptureQuality> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 256 });
    const rendered = await context.renderAsync();
    const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
    const binary = atob(small.base64!);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = decode(bytes, { useTArray: true, maxResolutionInMP: 4, maxMemoryUsageInMB: 32 });
    return evaluatePixels(decoded.data, decoded.width, decoded.height, roi);
  } catch { return unknownQuality(); }
}


/** Khoanh vết thương trên ảnh đã chụp (thu về 160 px). */
export async function detectInPhoto(uri: string): Promise<WoundDetection | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 160 });
    const rendered = await context.renderAsync();
    const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
    const binary = atob(small.base64!);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = decode(bytes, { useTArray: true, maxResolutionInMP: 4, maxMemoryUsageInMB: 32 });
    return detectWound(decoded.data, decoded.width, decoded.height);
  } catch { return null; }
}
