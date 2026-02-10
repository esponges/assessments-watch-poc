import type { MonitoringEvent } from './events';
import type { ScoringStats, Flag } from './scoring';

// Assessment session metadata
export interface AssessmentSession {
  assessmentId: string;
  studentId: string;
  sessionId: string;
  startTimestamp: number;
  endTimestamp?: number;
  duration?: number;
  userAgent: string;
  screenResolution: {
    width: number;
    height: number;
  };
  cameraResolution?: {
    width: number;
    height: number;
  };
  metadata?: Record<string, unknown>;
}

// JSON output format matching the specification
export interface AssessmentLogEntry {
  assessmentId: string;
  studentId: string;
  sessionId: string;
  timestamp: number;
  duration: number;
  flagged: boolean;
  flagPriority: 'low' | 'medium' | 'high' | 'critical' | null;
  totalScore: number;
  events: AssessmentEventEntry[];
  summary: {
    totalEvents: number;
    multipleFaceEvents: number;
    lookingAwayEvents: number;
    systemEvents: number;
    averageConfidence: number;
    sessionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  flags: AssessmentFlagEntry[];
  statistics: {
    scoreBreakdown: {
      multipleFaces: number;
      lookingAway: number;
      other: number;
    };
    detectionQuality: {
      averageConfidence: number;
      lowConfidenceEvents: number;
      totalDetections: number;
    };
    sessionMetrics: {
      duration: number;
      continuousMonitoring: boolean;
      interruptions: number;
    };
  };
  metadata: {
    version: string;
    generatedAt: number;
    userAgent: string;
    screenResolution: string;
    cameraResolution?: string;
  };
}

// Event entry in the JSON log
export interface AssessmentEventEntry {
  id: string;
  timestamp: number;
  type: string;
  confidence: number;
  duration?: number;
  details: {
    // Multiple face detection
    faceCount?: number;
    previousFaceCount?: number;
    sustainedDuration?: number;
    
    // Looking away detection
    lookAwayDuration?: number;
    direction?: string;
    severity?: string;
    gazeAngle?: number;
    
    // Gaze tracking
    gazePoint?: { x: number; y: number };
    deviation?: number;
    eyesVisible?: boolean;
    
    // System events
    errorCode?: string;
    errorMessage?: string;
    systemCategory?: string;
    
    // Generic metadata
    metadata?: Record<string, unknown>;
  };
  score?: {
    pointsAwarded: number;
    reason: string;
    totalScore: number;
  };
}

// Flag entry in the JSON log
export interface AssessmentFlagEntry {
  id: string;
  timestamp: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  score: number;
  triggeringEventIds: string[];
  priority: number;
  category: string;
  resolved: boolean;
  resolvedAt?: number;
}

// Session state tracking
export interface SessionState {
  session: AssessmentSession;
  events: MonitoringEvent[];
  flags: Flag[];
  scoringStats: ScoringStats | null;
  isActive: boolean;
  startTime: number;
  lastEventTime: number;
  totalDuration: number;
  continuousMonitoring: boolean;
  interruptions: number;
}

// Logging configuration
export interface AssessmentLoggerConfig {
  enableRealTimeLogging: boolean;
  autoGenerateIds: boolean;
  validateJsonSchema: boolean;
  includeDetailedMetadata: boolean;
  compressOutput: boolean;
  maxEventHistory: number;
  eventDeduplication: boolean;
  timestampPrecision: 'milliseconds' | 'seconds';
  includeSystemEvents: boolean;
  anonymizeData: boolean;
}

// Logger options
export interface AssessmentLoggerOptions {
  config?: Partial<AssessmentLoggerConfig>;
  assessmentId?: string;
  studentId?: string;
  onLogGenerated?: (log: AssessmentLogEntry) => void;
  onError?: (error: Error, context?: string) => void;
  autoStart?: boolean;
}

// Export result
export interface AssessmentLogExport {
  filename: string;
  format: 'json' | 'json-pretty' | 'json-compressed';
  data: string;
  size: number;
  checksum?: string;
  generatedAt: number;
  sessionSummary: {
    totalEvents: number;
    duration: number;
    flagged: boolean;
    score: number;
  };
}

// Validation result
export interface LogValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  schema?: string;
  validatedAt: number;
}

// Real-time logging update
export interface LoggingUpdate {
  sessionId: string;
  timestamp: number;
  updateType: 'event_added' | 'flag_raised' | 'score_changed' | 'session_ended';
  data: {
    event?: AssessmentEventEntry;
    flag?: AssessmentFlagEntry;
    scoreChange?: {
      previousScore: number;
      newScore: number;
      pointsAwarded: number;
      reason: string;
    };
    sessionSummary?: {
      duration: number;
      totalEvents: number;
      currentScore: number;
      flagged: boolean;
    };
  };
}

// Default configuration
export const DEFAULT_ASSESSMENT_LOGGER_CONFIG: AssessmentLoggerConfig = {
  enableRealTimeLogging: true,
  autoGenerateIds: true,
  validateJsonSchema: true,
  includeDetailedMetadata: true,
  compressOutput: false,
  maxEventHistory: 10000,
  eventDeduplication: true,
  timestampPrecision: 'milliseconds',
  includeSystemEvents: true,
  anonymizeData: false
};

// JSON schema validation types
export interface JsonSchemaValidation {
  validateEvent: (event: AssessmentEventEntry) => LogValidationResult;
  validateFlag: (flag: AssessmentFlagEntry) => LogValidationResult;
  validateLogEntry: (log: AssessmentLogEntry) => LogValidationResult;
  validateSession: (session: AssessmentSession) => LogValidationResult;
}