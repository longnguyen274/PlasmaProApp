import { buildFilename, formatAreaForName, splitForPatient } from './naming';
import type { AppData, WoundImage } from './types';

export function researchFilename(data: AppData, im: WoundImage) {
  const p = data.patients.find(p => p.id === im.patientId);
  const w = data.wounds.find(w => w.id === im.woundId);
  if (!p?.researchCode || !w || im.areaCm2 === null) throw new Error('Ảnh chưa đủ thông tin nghiên cứu.');
  return buildFilename(p.researchCode, w.code, im.id, im.areaCm2, 'png');
}
export function researchCsv(data: AppData, images: WoundImage[]) {
  const rows = images.map(im => {
    const p = data.patients.find(p => p.id === im.patientId)!;
    const w = data.wounds.find(w => w.id === im.woundId)!;
    return [im.id, researchFilename(data, im), p.researchCode!, w.code, formatAreaForName(im.areaCm2!), splitForPatient(p.researchCode!)];
  });
  return [['image_id', 'filename', 'subject_code', 'wound_code', 'area_cm2', 'split'], ...rows].map(row => row.join(',')).join('\n') + '\n';
}
export function researchPhoto(im: WoundImage): WoundImage {
  return { ...im, uri: im.researchUri === 'demo' ? null : im.researchUri ?? null };
}

/** Explicit allowlist: never export device IDs, timestamps, clinician IDs or free-text fields. */
export function researchCaptureMetadata(images: WoundImage[]) {
  return images.map(im => ({
    image_id: im.id,
    area_reference_cm2: im.areaCm2,
    area_reference_source: im.source === 'demo' ? 'synthetic_demo' : 'clinician_manual',
    automatic_area_cm2: im.capture?.automaticMeasurement?.areaCm2 ?? null,
    automatic_area_status: im.capture?.automaticMeasurement?.status ?? 'unavailable',
    capture: im.capture ? {
      source: im.capture.imageSource,
      width: im.capture.width,
      height: im.capture.height,
      roi: { ...im.capture.roi },
      roi_coordinates: im.capture.roiCoordinates,
      quality_profile: im.capture.quality.profileId,
      quality_profile_validated: im.capture.quality.profileValidated,
      lighting: im.capture.quality.lighting,
      sharpness: im.capture.quality.sharpness,
      metrics: im.capture.quality.metrics ? { ...im.capture.quality.metrics } : null,
      reviewed_framing: im.capture.visualReview.framing,
      reviewed_lighting: im.capture.visualReview.lighting,
      reviewed_sharpness: im.capture.visualReview.sharpness,
      wound_detection: im.capture.wound ? { detector: im.capture.wound.detector, box: { ...im.capture.wound.box }, hull: im.capture.wound.hull.map(pt => [...pt]), area_fraction: im.capture.wound.areaFraction } : null,
      // Hình học AR của đúng frame đã chụp; không có ID phiên, thời điểm hay thông tin thiết bị.
      ar: im.capture.ar ? {
        framework: im.capture.ar.framework,
        intrinsics: { ...im.capture.ar.intrinsics },
        image_rotation_deg: im.capture.ar.imageRotationDeg,
        center_distance_m: im.capture.distance.valueM,
        center_distance_source: im.capture.distance.source,
        camera_forward: im.capture.ar.cameraForward ?? null,
        plane_normal: im.capture.ar.centerHit?.planeNormal ?? null,
        depth_available: !!im.capture.ar.depth,
      } : null,
    } : null,
  }));
}

