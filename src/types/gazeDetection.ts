import type { DetectedFace } from './faceDetection';

// 3D vector for gaze direction
export interface GazeVector {
  x: number;
  y: number;
  z: number;
}

// 2D point for screen coordinates
export interface GazePoint {
  x: number; // -1 to 1, left to right
  y: number; // -1 to 1, top to bottom
}

// Eye landmark points (from MediaPipe FaceMesh)
export interface EyeLandmarks {
  leftEye: Array<[number, number]>;
  rightEye: Array<[number, number]>;
  leftPupil: [number, number];
  rightPupil: [number, number];
  leftIris: [number, number];
  rightIris: [number, number];
}

// Gaze estimation result
export interface GazeEstimation {
  gazeVector: GazeVector;
  gazePoint: GazePoint; // Where user is looking on screen
  confidence: number; // 0-1 confidence score
  eyeLandmarks: EyeLandmarks;
  deviation: number; // Angle in degrees from center
  isLookingAway: boolean;
  eyesVisible: boolean;
  leftEyeOpen: boolean;
  rightEyeOpen: boolean;
}

// Gaze detection configuration
export interface GazeConfig {
  lookAwayThreshold: number; // Angle in degrees to consider "looking away"
  confidenceThreshold: number; // Minimum confidence for reliable gaze estimation
  smoothingWindow: number; // Number of frames to smooth over
  calibrationPoints: number; // Number of calibration points (9-point, 5-point, etc.)
  eyeOpenThreshold: number; // Threshold for detecting closed eyes
  stabilityThreshold: number; // Minimum stability time before registering gaze change
}

// Calibration data
export interface CalibrationPoint {
  screenPoint: GazePoint;
  gazePoint: GazePoint;
  confidence: number;
  timestamp: number;
}

export interface CalibrationData {
  points: CalibrationPoint[];
  transformation: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  };
  quality: number; // 0-1 calibration quality score
  timestamp: number;
}

// Gaze tracking statistics
export interface GazeStats {
  totalFrames: number;
  averageConfidence: number;
  gazeStability: number; // How stable the gaze has been
  lookAwayEvents: number;
  calibrationQuality: number;
  averageDeviation: number; // Average deviation from center in degrees
  sessionStartTime: number;
}

// Gaze detection options
export interface GazeDetectionOptions {
  config?: Partial<GazeConfig>;
  onGazeUpdate?: (estimation: GazeEstimation) => void;
  onCalibrationNeeded?: () => void;
  onError?: (error: Error, context?: string) => void;
  onStatsUpdate?: (stats: GazeStats) => void;
}

// Face mesh landmarks indices for eye tracking
export const EYE_LANDMARK_INDICES = {
  LEFT_EYE: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  RIGHT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  LEFT_IRIS: [468, 469, 470, 471, 472],
  RIGHT_IRIS: [473, 474, 475, 476, 477],
  LEFT_EYEBROW: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  RIGHT_EYEBROW: [296, 334, 293, 300, 276, 283, 282, 295, 285, 336]
};

// Gaze direction zones
export type GazeZone = 
  | 'center'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right'
  | 'away';

// Gaze zone configuration
export interface GazeZoneConfig {
  centerRadius: number; // Radius in degrees for center zone
  zones: Record<GazeZone, {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    color: string;
  }>;
}

// Enhanced gaze estimation with zones and history
export interface EnhancedGazeEstimation extends GazeEstimation {
  zone: GazeZone;
  previousZone: GazeZone | null;
  zoneStability: number; // How long in current zone (ms)
  movement: {
    velocity: GazeVector;
    acceleration: GazeVector;
  };
  history: GazePoint[]; // Recent gaze points for smoothing
}