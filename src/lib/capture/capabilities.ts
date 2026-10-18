import * as Device from 'expo-device';
import { CameraView } from 'expo-camera';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { DeviceCapabilities } from './types';

interface ARProbe {
  getCapabilities(): Promise<{
    worldTracking: boolean; depth?: boolean; depthConfidence: boolean; sceneMesh: boolean;
    framework: 'arkit' | 'arcore'; arcoreStatus?: string;
  }>;
}
export async function inspectCapabilities(permission: string): Promise<DeviceCapabilities> {
  let cameraSupported: boolean | null = null;
  try { cameraSupported = await CameraView.isAvailableAsync(); } catch { /* Unknown is not unsupported. */ }
  const result: DeviceCapabilities = {
    platform: Platform.OS, model: Device.modelName, osVersion: Device.osVersion, cameraSupported, cameraPermission: permission,
    arAdapter: Platform.OS === 'web' ? 'unavailable' : 'not_in_build', arFramework: null, arcoreStatus: null,
    worldTracking: null, depth: null, depthConfidence: null, sceneMesh: null,
    measurementProfileAvailable: false, segmentationModelAvailable: false,
  };
  // Module chỉ có trong bản cài riêng (development build); Expo Go trả về null.
  const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<ARProbe>('PlasmaAR');
  if(native) {
    try {
      const probe = await native.getCapabilities();
      Object.assign(result, {
        worldTracking: probe.worldTracking, depth: probe.depth ?? null, depthConfidence: probe.depthConfidence, sceneMesh: probe.sceneMesh,
        arFramework: probe.framework, arcoreStatus: probe.arcoreStatus ?? null,
        arAdapter: probe.worldTracking ? 'available' : 'unavailable',
      });
    }
    catch { result.arAdapter='unavailable'; }
  }
  return result;
}
