import type { CaptureQuality, QualityMetrics, Roi } from './types';

export const DEFAULT_ROI: Roi = { x: 0.15, y: 0.15, width: 0.7, height: 0.7 };
// Exploratory, non-blocking image checks, NOT calibrated for wound tissue or skin tones.
// Never return "pass" from these heuristics or enable a physical measurement.
export const PREVIEW_PROFILE = { id: 'image-preview-experimental-v1', darkCutoff: 25, clipCutoff: 248, darkFraction: 0.6, clippedFraction: 0.2, lowDetailVariance: 25 } as const;
export function validRoi(roi: Roi) {
  return [roi.x, roi.y, roi.width, roi.height].every(Number.isFinite)
    && roi.x >= 0 && roi.y >= 0 && roi.width > 0 && roi.height > 0
    && roi.x + roi.width <= 1.000001 && roi.y + roi.height <= 1.000001;
}
export function unknownQuality(reason = 'Chưa phân tích được ảnh. Hãy kiểm tra ảnh bằng mắt.'): CaptureQuality {
  return { profileId: PREVIEW_PROFILE.id, profileValidated: false, lighting: 'unknown', sharpness: 'unknown', reflection: 'unknown', movement: 'unknown', metrics: null, warnings: [reason] };
}
export function evaluatePixels(data: Uint8Array | Uint8ClampedArray, width: number, height: number, roi: Roi): CaptureQuality {
  if (!validRoi(roi) || width < 4 || height < 4 || data.length !== width * height * 4) return unknownQuality();
  const left = Math.max(1, Math.floor(roi.x * width)), top = Math.max(1, Math.floor(roi.y * height));
  const right = Math.min(width - 1, Math.ceil((roi.x + roi.width) * width)), bottom = Math.min(height - 1, Math.ceil((roi.y + roi.height) * height));
  const gray = new Float32Array(width * height);
  for (let i=0;i<gray.length;i++) gray[i] = 0.2126*data[i*4] + 0.7152*data[i*4+1] + 0.0722*data[i*4+2];
  let count=0,sum=0,dark=0,clipped=0,lap=0,lap2=0;
  for(let y=top;y<bottom;y++) for(let x=left;x<right;x++) {
    const i=y*width+x, g=gray[i];
    count++; sum+=g; dark+=Number(g<PREVIEW_PROFILE.darkCutoff); clipped+=Number(g>PREVIEW_PROFILE.clipCutoff);
    const v=gray[i-1]+gray[i+1]+gray[i-width]+gray[i+width]-4*g; lap+=v;lap2+=v*v;
  }
  if(count<16) return unknownQuality();
  const metrics: QualityMetrics = { meanLuma:sum/count, darkFraction:dark/count, clippedFraction:clipped/count, laplacianVariance:Math.max(0,lap2/count-(lap/count)**2), samples:count };
  const warnings:string[]=[];
  if(metrics.darkFraction>PREVIEW_PROFILE.darkFraction) warnings.push('Vùng chọn có thể thiếu sáng. Hãy bổ sung ánh sáng.');
  if(metrics.clippedFraction>PREVIEW_PROFILE.clippedFraction) warnings.push('Vùng chọn có nhiều điểm quá sáng. Kiểm tra chói và chi tiết bị mất.');
  if(metrics.laplacianVariance<PREVIEW_PROFILE.lowDetailVariance) warnings.push('Vùng chọn ít chi tiết hoặc chưa rõ nét. Phóng to để kiểm tra.');
  return { profileId:PREVIEW_PROFILE.id,profileValidated:false,lighting:metrics.darkFraction>PREVIEW_PROFILE.darkFraction||metrics.clippedFraction>PREVIEW_PROFILE.clippedFraction?'warn':'unknown',sharpness:metrics.laplacianVariance<PREVIEW_PROFILE.lowDetailVariance?'warn':'unknown',reflection:'unknown',movement:'unknown',metrics,warnings };
}
export interface MeasurementEvidence {
  featureEnabled: boolean; validatedProfile: boolean; qualityAccepted: boolean; maskReviewed: boolean;
  trackingValid: boolean; geometryMatchesRoi: boolean; metricScaleAvailable: boolean;
  alignmentValid: boolean; geometryAcceptable: boolean; scopeSupported: boolean;
  source: 'gallery' | 'live_ar_camera'; sessionId: string | null; imageFrameId: string | null; geometryFrameId: string | null;
}
export function measurementAllowed(e: MeasurementEvidence) {
  return e.source === 'live_ar_camera' && !!e.sessionId && !!e.imageFrameId && e.imageFrameId === e.geometryFrameId
    && e.featureEnabled && e.validatedProfile && e.qualityAccepted && e.maskReviewed
    && e.trackingValid && e.geometryMatchesRoi && e.metricScaleAvailable && e.alignmentValid && e.geometryAcceptable && e.scopeSupported;
}

