export type PermissionStatus = 'pending' | 'granted' | 'denied' | 'error';

export interface CameraError {
  type: 'NO_CAMERA' | 'PERMISSION_DENIED' | 'CAMERA_IN_USE' | 'UNKNOWN';
  message: string;
}

export interface CameraPermissionProps {
  onPermissionGranted: (stream: MediaStream) => void;
  onPermissionDenied: (error: CameraError) => void;
}