import type { GazeZone, EnhancedGazeEstimation } from './gazeDetection';

// Looking away detection configuration
export interface LookingAwayConfig {
  lookAwayThreshold: number; // Degrees from center to consider "looking away"
  sustainedThreshold: number; // Milliseconds for sustained looking away (5000ms = 5 seconds)
  confidenceThreshold: number; // Minimum confidence for reliable detection
  scoringThreshold: number; // Duration after which points are awarded (5 seconds)
  resetGracePeriod: number; // Grace period when returning to screen before resetting timer
  maxCumulativeTime: number; // Maximum cumulative looking away time to track
  pointsPerScoringEvent: number; // Points awarded per scoring event (+3 per spec)
}

// Looking away severity levels
export type LookingAwaySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

// Looking away direction for better context
export type LookingAwayDirection = 
  | 'slightly-left' 
  | 'slightly-right'
  | 'moderately-left'
  | 'moderately-right'
  | 'far-left'
  | 'far-right'
  | 'up'
  | 'down'
  | 'extreme';

// Looking away event
export interface LookingAwayEvent {
  id: string;
  timestamp: number;
  type: 'looking_away_started' | 'looking_away_ended' | 'looking_away_scored';
  duration: number; // Duration in milliseconds
  direction: LookingAwayDirection;
  severity: LookingAwaySeverity;
  confidence: number;
  gazeDeviation: number; // Degrees from center
  gazeZone: GazeZone;
  pointsAwarded?: number; // Points awarded for this event
  metadata?: {
    averageDeviation?: number;
    maxDeviation?: number;
    returnedToCenter?: boolean;
    intermittent?: boolean; // Whether this was part of intermittent looking away
  };
}

// Looking away status tracking
export interface LookingAwayStatus {
  isLookingAway: boolean;
  currentDuration: number; // Current continuous looking away duration
  cumulativeDuration: number; // Total looking away time in session
  lookingAwayStartTime: number | null;
  lastScoringTime: number | null; // Last time points were awarded
  currentDirection: LookingAwayDirection | null;
  currentSeverity: LookingAwaySeverity;
  scoringEvents: number; // Number of times points were awarded
  totalPointsAwarded: number;
  lastEvent?: LookingAwayEvent;
}

// Looking away pattern analysis
export interface LookingAwayPattern {
  episodes: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    direction: LookingAwayDirection;
    severity: LookingAwaySeverity;
    scored: boolean;
  }>;
  averageEpisodeDuration: number;
  maxEpisodeDuration: number;
  frequentDirection: LookingAwayDirection | null;
  totalEpisodes: number;
  scoringEpisodes: number;
  lastEpisodeTime: number;
}

// Looking away statistics
export interface LookingAwayStats {
  totalLookingAwayTime: number; // Total milliseconds looking away
  scoringEvents: number; // Number of scoring events (>5 seconds)
  averageEpisodeDuration: number; // Average duration per looking away episode
  maxContinuousDuration: number; // Longest continuous looking away
  lookingAwayFrequency: number; // Episodes per minute
  commonDirection: LookingAwayDirection | null;
  totalPointsAwarded: number;
  sessionStartTime: number;
  patterns: LookingAwayPattern;
}

// Looking away detection options
export interface LookingAwayDetectionOptions {
  config?: Partial<LookingAwayConfig>;
  onLookingAwayStart?: (event: LookingAwayEvent) => void;
  onLookingAwayEnd?: (event: LookingAwayEvent) => void;
  onLookingAwayScoring?: (event: LookingAwayEvent) => void;
  onStatsUpdate?: (stats: LookingAwayStats) => void;
  onError?: (error: Error, context?: string) => void;
}

// Timer visualization states
export interface LookingAwayTimerState {
  isActive: boolean;
  currentTime: number;
  progressToScoring: number; // 0-1 progress to scoring threshold
  timeToScoring: number; // Milliseconds remaining until scoring
  severity: LookingAwaySeverity;
  shouldShowWarning: boolean;
}

// Looking away warning levels
export interface LookingAwayWarning {
  level: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  timeRemaining: number;
  showCountdown: boolean;
  color: string;
  icon: string;
}

// Enhanced looking away detection result
export interface LookingAwayDetectionResult {
  status: LookingAwayStatus;
  timerState: LookingAwayTimerState;
  warning: LookingAwayWarning | null;
  recentEvents: LookingAwayEvent[];
  stats: LookingAwayStats;
  shouldTriggerScoring: boolean;
}