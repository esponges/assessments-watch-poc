export interface FaceDetectionResult {
  faces: DetectedFace[];
  timestamp: number;
  frameWidth: number;
  frameHeight: number;
  processingTime: number;
  confidence: number;
  error: string | null;
}

export interface DetectedFace {
  id: string;
  boundingBox: {
    topLeft: [number, number];
    bottomRight: [number, number];
    width: number;
    height: number;
  };
  landmarks?: Array<[number, number]>;
  confidence: number;
  probability: number;
}

export interface FaceDetectionConfig {
  maxFaces: number;
  scoreThreshold: number;
  iouThreshold: number;
  enableLandmarks: boolean;
  debugMode: boolean;
}

export interface FaceDetectionStats {
  totalDetections: number;
  averageProcessingTime: number;
  currentFPS: number;
  averageFacesPerFrame: number;
  isDetecting: boolean;
}

export interface FaceDetectionOptions {
  config?: Partial<FaceDetectionConfig>;
  onDetection?: (result: FaceDetectionResult) => void | Promise<void>;
  onError?: (error: Error) => void;
  onStatsUpdate?: (stats: FaceDetectionStats) => void;
}