export interface FaceCountConfig {
  confidenceThreshold: number; // Minimum confidence for reliable face detection
  smoothingWindow: number; // Number of frames to smooth over
  stableCountThreshold: number; // Consecutive frames needed for stable count
  alertSensitivity: number; // Sensitivity for multiple-face alerts (0-1)
  maxFaceTrackingDistance: number; // Maximum distance to track same face across frames
}

export interface FaceCountEvent {
  id: string;
  timestamp: number;
  eventType: 'count_change' | 'multiple_faces_detected' | 'single_face_restored' | 'no_faces_detected';
  previousCount: number;
  currentCount: number;
  confidence: number;
  duration?: number; // For end events, how long the condition lasted
}

export interface FaceCountData {
  timestamp: number;
  rawCount: number; // Direct count from detection
  smoothedCount: number; // Smoothed count after temporal filtering
  confidence: number; // Average confidence of detected faces
  isStable: boolean; // Whether count has been stable for threshold frames
}

export interface FaceCountStats {
  totalFrames: number;
  averageFaceCount: number;
  maxFaceCount: number;
  multipleFaceDetections: number;
  noFaceDetections: number;
  singleFaceDetections: number;
  currentStability: number; // How many consecutive frames current count has been stable
  sessionStartTime: number;
}

export interface FaceCountHistory {
  data: FaceCountData[];
  maxHistory: number; // Maximum number of entries to keep
}

export interface FaceCounterOptions {
  config?: Partial<FaceCountConfig>;
  onCountChange?: (event: FaceCountEvent) => void | Promise<void>;
  onStatsUpdate?: (stats: FaceCountStats) => void;
  onError?: (error: Error) => void;
}

export interface FaceCountStatus {
  currentCount: number;
  smoothedCount: number;
  isStable: boolean;
  confidence: number;
  status: 'normal' | 'multiple_faces' | 'no_faces' | 'uncertain';
  lastEvent?: FaceCountEvent;
}