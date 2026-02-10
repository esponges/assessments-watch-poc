export interface ScoreConfig {
  multipleFacesPoints: number; // Points added for multiple faces detected
  sustainedMultipleFacesThreshold: number; // Seconds threshold for sustained detection
  sustainedMultipleFacesBonus: number; // Bonus points for sustained detection
  confidenceThreshold: number; // Minimum confidence required for scoring
  temporalValidationWindow: number; // MS to validate detection isn't a glitch
}

export interface ScoreEvent {
  id: string;
  timestamp: number;
  type: 'multiple_faces_detected' | 'sustained_multiple_faces' | 'score_reset';
  points: number;
  reason: string;
  confidence: number;
  metadata?: {
    faceCount?: number;
    duration?: number;
    previousScore?: number;
    newScore?: number;
  };
}

export interface MultiplePersonEvent {
  id: string;
  timestamp: number;
  type: 'multiple_person_start' | 'multiple_person_end' | 'multiple_person_ongoing';
  faceCount: number;
  confidence: number;
  duration: number; // Duration in milliseconds
  sustained: boolean; // Whether this has been sustained long enough
  metadata?: {
    detectionQuality?: 'high' | 'medium' | 'low';
    previousFaceCount?: number;
    confidenceHistory?: number[];
  };
}

export interface ScoreStatus {
  totalScore: number;
  isFlagged: boolean; // True if score >= flagging threshold
  flagLevel: 'none' | 'low' | 'medium' | 'high';
  lastScoreEvent?: ScoreEvent;
  scoreHistory: ScoreEvent[];
}

export interface MultiplePersonDetectionStatus {
  isMultiplePersonsDetected: boolean;
  faceCount: number;
  confidence: number;
  detectionStartTime: number | null;
  currentDuration: number;
  isSustained: boolean;
  lastEvent?: MultiplePersonEvent;
}

export interface MultiplePersonDetectorConfig {
  scoreConfig: ScoreConfig;
  sustainedThresholdMs: number; // 3000ms for sustained detection
  glitchFilterMs: number; // 200ms to filter out brief false positives
  flaggingThreshold: number; // Score threshold for flagging (8 points)
  confidenceThreshold: number; // Minimum confidence for detection
  maxScoreHistory: number; // Maximum score events to keep in history
}

export interface MultiplePersonDetectorOptions {
  config?: Partial<MultiplePersonDetectorConfig>;
  onScoreChange?: (scoreStatus: ScoreStatus) => void;
  onMultiplePersonEvent?: (event: MultiplePersonEvent) => void;
  onError?: (error: Error, context?: string) => void;
}

export interface MultiplePersonDetectorStats {
  totalDetections: number;
  sustainedDetections: number;
  averageDetectionDuration: number;
  maxSimultaneousFaces: number;
  totalPointsAwarded: number;
  detectionConfidenceAverage: number;
  sessionStartTime: number;
}