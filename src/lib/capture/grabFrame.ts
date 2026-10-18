import type { CameraView } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';

export interface SmallFrame { data: Uint8Array; width: number; height: number; channels: number }

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// Expo Go không cho đọc khung camera trực tiếp: chụp im lặng một ảnh nhỏ rồi thu về 120 px.
export async function grabFrame(camera: CameraView | null): Promise<SmallFrame | null> {
  if (!camera) return null;
  const picture = await camera.takePictureAsync({ quality: 0.1, shutterSound: false, exif: false });
  if (!picture?.uri) return null;
  const context = ImageManipulator.manipulate(picture.uri);
  context.resize({ width: 120 });
  const rendered = await context.renderAsync();
  const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!small.base64) return null;
  const decoded = decode(base64ToBytes(small.base64), { useTArray: true, maxResolutionInMP: 1, maxMemoryUsageInMB: 16 });
  return { data: decoded.data, width: decoded.width, height: decoded.height, channels: 4 };
}
