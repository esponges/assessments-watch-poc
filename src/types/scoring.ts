import type { MonitoringEvent } from './events';

export interface ScoringConfig {
  multipleFacePoints: number; // +10 points per spec
  lookingAwayPoints: number; // +3 points per spec
  lookingAwayThreshold: number; // 5000ms = 5 seconds per spec
  flagThreshold: number; // 8+ points per spec
  scoreDecayEnabled: boolean;
  scoreDecayRate: number; // Points lost per minute of good behavior
  maxScore: number; // Maximum score cap
}

export interface ScoreChange {
  id: string;
  timestamp: number;
  previousScore: number;
  newScore: number;
  pointsChanged: number;
  reason: string;
  triggeringEvent: string;
  eventType: MonitoringEvent['type'];
  confidence: number;
}

export interface Flag {
  id: string;
  timestamp: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  score: number;
  triggeringEvents: string[];
  isActive: boolean;
  priority: number; // 1-10, higher is more urgent
  category: 'multiple_faces' | 'looking_away' | 'system' | 'composite';
  metadata?: Record<string, unknown>;
}

export interface ScoreHistoryEntry {
  timestamp: number;
  score: number;
  event?: MonitoringEvent;
  change?: ScoreChange;
}

export interface ScoringStats {
  currentScore: number;
  maxScoreReached: number;
  totalPointsAwarded: number;
  totalPointsLost: number;
  scoreChangeCount: number;
  averageScore: number;
  sessionDuration: number;
  flags: Flag[];
  scoreHistory: ScoreHistoryEntry[];
  eventContributions: {
    multipleFaces: {
      events: number;
      totalPoints: number;
      averagePoints: number;
    };
    lookingAway: {
      events: number;
      totalPoints: number;
      averagePoints: number;
    };
    other: {
      events: number;
      totalPoints: number;
      averagePoints: number;
    };
  };
}

export interface ScoringSummary {
  finalScore: number;
  flagged: boolean;
  highestFlag: Flag | null;
  totalFlags: number;
  flagsByLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  keyIssues: string[];
}

export interface ScoreManagerState {
  config: ScoringConfig;
  stats: ScoringStats;
  summary: ScoringSummary;
  isActive: boolean;
  sessionId: string | null;
  sessionStartTime: number | null;
}

export interface ScoreCalculationResult {
  pointsAwarded: number;
  reason: string;
  shouldFlag: boolean;
  flagLevel?: Flag['level'];
  flagReason?: string;
  confidence: number;
}

export type ScoreEventHandler = (
  change: ScoreChange,
  stats: ScoringStats
) => void;

export type FlagEventHandler = (
  flag: Flag,
  stats: ScoringStats
) => void;

export interface ScoreManagerOptions {
  config?: Partial<ScoringConfig>;
  onScoreChange?: ScoreEventHandler;
  onFlagRaised?: FlagEventHandler;
  onError?: (error: Error, context?: string) => void;
  sessionId?: string;
  autoStart?: boolean;
}

// Default scoring configuration per spec requirements
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  multipleFacePoints: 10, // +10 points for multiple faces per spec
  lookingAwayPoints: 3,   // +3 points for >5s looking away per spec
  lookingAwayThreshold: 5000, // 5 seconds
  flagThreshold: 8, // 8+ points triggers flag per spec
  scoreDecayEnabled: false, // Disabled by default
  scoreDecayRate: 0.5, // 0.5 points per minute
  maxScore: 100 // Reasonable cap
};

export const DEFAULT_SCORE_MANAGER_STATE: ScoreManagerState = {
  config: DEFAULT_SCORING_CONFIG,
  stats: {
    currentScore: 0,
    maxScoreReached: 0,
    totalPointsAwarded: 0,
    totalPointsLost: 0,
    scoreChangeCount: 0,
    averageScore: 0,
    sessionDuration: 0,
    flags: [],
    scoreHistory: [],
    eventContributions: {
      multipleFaces: { events: 0, totalPoints: 0, averagePoints: 0 },
      lookingAway: { events: 0, totalPoints: 0, averagePoints: 0 },
      other: { events: 0, totalPoints: 0, averagePoints: 0 }
    }
  },
  summary: {
    finalScore: 0,
    flagged: false,
    highestFlag: null,
    totalFlags: 0,
    flagsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    riskLevel: 'low',
    recommendations: [],
    keyIssues: []
  },
  isActive: false,
  sessionId: null,
  sessionStartTime: null
};