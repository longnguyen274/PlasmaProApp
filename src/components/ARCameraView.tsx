import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { forwardRef, useImperativeHandle, useRef, type ComponentType, type Ref } from 'react';
import { Platform, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';

import type { ARCaptureResult, ARSessionError, ARTrackingEvent } from '@/lib/capture/ar';

interface NativeHandle { capture(): Promise<ARCaptureResult> }
interface NativeProps {
  ref?: Ref<NativeHandle>;
  style?: StyleProp<ViewStyle>;
  focusPoint?: number[];
  onTrackingChange?: (event: NativeSyntheticEvent<ARTrackingEvent>) => void;
  onSessionError?: (event: NativeSyntheticEvent<ARSessionError>) => void;
}

// Expo Go và web không có module native này; khi đó màn chụp dùng camera thường.
const NativeARView: ComponentType<NativeProps> | null =
  Platform.OS !== 'web' && requireOptionalNativeModule('PlasmaAR') ? requireNativeView<NativeProps>('PlasmaAR') : null;

export const arViewInBuild = NativeARView !== null;

export interface ARCameraHandle { capture(): Promise<ARCaptureResult> }

export const ARCameraView = forwardRef<ARCameraHandle, {
  style?: StyleProp<ViewStyle>;
  /** Điểm cần đo khoảng cách (chuẩn hóa theo khung xem), thường là tâm vết thương đang khoanh. */
  focusPoint?: number[];
  onTracking: (event: ARTrackingEvent) => void;
  onError: (error: ARSessionError) => void;
}>(function ARCameraView({ style, focusPoint, onTracking, onError }, ref) {
  const native = useRef<NativeHandle>(null);
  useImperativeHandle(ref, () => ({
    capture: () => native.current ? native.current.capture() : Promise.reject(new Error('Phiên AR chưa sẵn sàng.')),
  }), []);
  if (!NativeARView) return null;
  return (
    <NativeARView
      ref={native}
      style={style}
      focusPoint={focusPoint}
      onTrackingChange={(e) => onTracking(e.nativeEvent)}
      onSessionError={(e) => onError(e.nativeEvent)}
    />
  );
});
