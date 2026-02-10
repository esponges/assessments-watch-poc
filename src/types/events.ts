// Base event structure that all events must implement
export interface BaseEvent {
  id: string;
  timestamp: number;
  type: string;
  confidence: number; // 0-1 confidence score
  duration?: number; // Duration in milliseconds for events with duration
  metadata?: Record<string, unknown>; // Extensible metadata
}

// Face counting specific events
export interface FaceCountChangeEvent extends BaseEvent {
  type: 'face_count_change';
  previousCount: number;
  currentCount: number;
  detectionData: {
    faces: Array<{
      id: string;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      landmarks?: Array<[number, number]>;
      confidence: number;
    }>;
    frameSize: {
      width: number;
      height: number;
    };
  };
}

export interface MultipleFacesDetectedEvent extends BaseEvent {
  type: 'multiple_faces_detected';
  faceCount: number;
  previousCount: number;
  sustainedDuration?: number; // How long multiple faces have been detected
}

export interface SingleFaceRestoredEvent extends BaseEvent {
  type: 'single_face_restored';
  previousCount: number;
  multipleFacesDuration: number; // How long multiple faces were detected
}

export interface NoFacesDetectedEvent extends BaseEvent {
  type: 'no_faces_detected';
  previousCount: number;
  noFacesDuration?: number; // How long no faces have been detected
}

// Gaze tracking events (for future implementation)
export interface GazeEvent extends BaseEvent {
  type: 'gaze_direction_change' | 'looking_away_started' | 'looking_away_ended';
  gazeData: {
    direction: {
      x: number; // -1 to 1, left to right
      y: number; // -1 to 1, up to down
    };
    deviation: number; // Degrees from center
    isLookingAway: boolean;
  };
}

export interface LookingAwayEvent extends BaseEvent {
  type: 'looking_away_extended';
  lookAwayDuration: number;
  direction: {
    x: number;
    y: number;
  };
  severity: 'minor' | 'moderate' | 'severe';
}

// System and technical events
export interface SystemEvent extends BaseEvent {
  type: 'session_started' | 'session_ended' | 'camera_error' | 'ai_model_loaded' | 'ai_processing_error';
  systemData: {
    eventCategory: 'system' | 'camera' | 'ai' | 'performance';
    details: string;
    errorCode?: string;
    performance?: {
      fps: number;
      processingTime: number;
      memoryUsage?: number;
    };
  };
}

export interface SessionEvent extends BaseEvent {
  type: 'session_started' | 'session_paused' | 'session_resumed' | 'session_ended';
  sessionData: {
    sessionId: string;
    userId?: string;
    assessmentId?: string;
    totalDuration?: number;
    reason?: string; // For pauses or early termination
  };
}

// Scoring and flagging events
export interface ScoreEvent extends BaseEvent {
  type: 'score_increased' | 'score_decreased' | 'score_reset';
  scoreData: {
    previousScore: number;
    currentScore: number;
    pointsChanged: number;
    reason: string; // Why the score changed
    triggeringEvent: string; // ID of event that triggered score change
  };
}

export interface FlagEvent extends BaseEvent {
  type: 'flag_raised' | 'flag_cleared' | 'flag_escalated';
  flagData: {
    flagLevel: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    score: number;
    triggeringEvents: string[]; // IDs of events that led to flag
    automaticFlag: boolean; // Whether flag was automatic or manual
  };
}

// Union type of all possible events
export type MonitoringEvent = 
  | FaceCountChangeEvent
  | MultipleFacesDetectedEvent
  | SingleFaceRestoredEvent
  | NoFacesDetectedEvent
  | GazeEvent
  | LookingAwayEvent
  | SystemEvent
  | SessionEvent
  | ScoreEvent
  | FlagEvent;

// Event filtering and querying types
export interface EventFilter {
  eventTypes?: MonitoringEvent['type'][];
  timeRange?: {
    start: number;
    end: number;
  };
  confidenceThreshold?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface EventQuery {
  filter?: EventFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'confidence' | 'type';
  sortOrder?: 'asc' | 'desc';
}

// Event summary and statistics types
export interface EventSummary {
  totalEvents: number;
  eventsByType: Record<MonitoringEvent['type'], number>;
  timeRange: {
    start: number;
    end: number;
  };
  averageConfidence: number;
  flaggedEventsCount: number;
  suspiciousActivityScore: number;
}

export interface EventStatistics {
  summary: EventSummary;
  patterns: {
    multipleFaceIncidents: Array<{
      startTime: number;
      endTime: number;
      maxFaceCount: number;
      duration: number;
    }>;
    lookingAwayPeriods: Array<{
      startTime: number;
      endTime: number;
      duration: number;
      severity: string;
    }>;
    systemIssues: Array<{
      timestamp: number;
      type: string;
      severity: string;
    }>;
  };
}

// Event validation schema types
export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Event export formats
export interface EventExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeMetadata: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  eventTypes?: MonitoringEvent['type'][];
  compression?: boolean;
}

export interface EventExportResult {
  format: string;
  data: string | object;
  filename: string;
  size: number;
  eventCount: number;
}