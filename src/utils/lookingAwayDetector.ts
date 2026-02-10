import type { EnhancedGazeEstimation, GazeZone } from '../types/gazeDetection';
import type {
  LookingAwayConfig,
  LookingAwayEvent,
  LookingAwayStatus,
  LookingAwayStats,
  LookingAwayPattern,
  LookingAwayDirection,
  LookingAwaySeverity,
  LookingAwayTimerState,
  LookingAwayWarning,
  LookingAwayDetectionResult,
  LookingAwayDetectionOptions
} from '../types/lookingAwayDetection';

export class LookingAwayDetector {
  private config: LookingAwayConfig;
  private status: LookingAwayStatus;
  private stats: LookingAwayStats;
  private patterns: LookingAwayPattern;
  private recentEvents: LookingAwayEvent[] = [];
  private frameCount = 0;
  private lastProcessTime = 0;

  // Callbacks
  private onLookingAwayStart?: (event: LookingAwayEvent) => void;
  private onLookingAwayEnd?: (event: LookingAwayEvent) => void;
  private onLookingAwayScoring?: (event: LookingAwayEvent) => void;
  private onStatsUpdate?: (stats: LookingAwayStats) => void;
  private onError?: (error: Error, context?: string) => void;

  constructor(options: LookingAwayDetectionOptions = {}) {
    this.config = this.createDefaultConfig(options.config);
    this.onLookingAwayStart = options.onLookingAwayStart;
    this.onLookingAwayEnd = options.onLookingAwayEnd;
    this.onLookingAwayScoring = options.onLookingAwayScoring;
    this.onStatsUpdate = options.onStatsUpdate;
    this.onError = options.onError;

    this.status = this.createInitialStatus();
    this.stats = this.createInitialStats();
    this.patterns = this.createInitialPatterns();
  }

  private createDefaultConfig(customConfig?: Partial<LookingAwayConfig>): LookingAwayConfig {
    return {
      lookAwayThreshold: 30, // degrees
      sustainedThreshold: 5000, // 5 seconds
      confidenceThreshold: 0.6,
      scoringThreshold: 5000, // 5 seconds for scoring
      resetGracePeriod: 500, // 500ms grace period
      maxCumulativeTime: 300000, // 5 minutes max tracking
      pointsPerScoringEvent: 3, // +3 points per spec
      ...customConfig
    };
  }

  private createInitialStatus(): LookingAwayStatus {
    return {
      isLookingAway: false,
      currentDuration: 0,
      cumulativeDuration: 0,
      lookingAwayStartTime: null,
      lastScoringTime: null,
      currentDirection: null,
      currentSeverity: 'minor',
      scoringEvents: 0,
      totalPointsAwarded: 0
    };
  }

  private createInitialStats(): LookingAwayStats {
    return {
      totalLookingAwayTime: 0,
      scoringEvents: 0,
      averageEpisodeDuration: 0,
      maxContinuousDuration: 0,
      lookingAwayFrequency: 0,
      commonDirection: null,
      totalPointsAwarded: 0,
      sessionStartTime: Date.now(),
      patterns: this.createInitialPatterns()
    };
  }

  private createInitialPatterns(): LookingAwayPattern {
    return {
      episodes: [],
      averageEpisodeDuration: 0,
      maxEpisodeDuration: 0,
      frequentDirection: null,
      totalEpisodes: 0,
      scoringEpisodes: 0,
      lastEpisodeTime: 0
    };
  }

  public processGazeEstimation(estimation: EnhancedGazeEstimation): LookingAwayDetectionResult {
    try {
      const currentTime = Date.now();
      this.frameCount++;
      this.lastProcessTime = currentTime;

      // Determine if currently looking away
      const isCurrentlyLookingAway = this.isLookingAway(estimation);
      const direction = this.determineDirection(estimation);
      const severity = this.determineSeverity(estimation.deviation);

      // Process state changes
      if (isCurrentlyLookingAway && !this.status.isLookingAway) {
        this.handleLookingAwayStart(currentTime, direction, severity, estimation);
      } else if (!isCurrentlyLookingAway && this.status.isLookingAway) {
        this.handleLookingAwayEnd(currentTime, estimation);
      } else if (isCurrentlyLookingAway && this.status.isLookingAway) {
        this.handleLookingAwayContinue(currentTime, direction, severity, estimation);
      }

      // Update stats
      this.updateStats();

      // Generate result
      const result: LookingAwayDetectionResult = {
        status: { ...this.status },
        timerState: this.generateTimerState(currentTime),
        warning: this.generateWarning(currentTime),
        recentEvents: [...this.recentEvents.slice(-10)], // Last 10 events
        stats: { ...this.stats },
        shouldTriggerScoring: this.shouldTriggerScoring(currentTime)
      };

      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'processGazeEstimation');
      
      // Return safe default result
      return {
        status: this.status,
        timerState: { isActive: false, currentTime: 0, progressToScoring: 0, timeToScoring: 0, severity: 'minor', shouldShowWarning: false },
        warning: null,
        recentEvents: [],
        stats: this.stats,
        shouldTriggerScoring: false
      };
    }
  }

  private isLookingAway(estimation: EnhancedGazeEstimation): boolean {
    // Check if confidence is sufficient
    if (estimation.confidence < this.config.confidenceThreshold) {
      return false; // Don't detect looking away with low confidence
    }

    // Check if deviation exceeds threshold
    if (estimation.deviation > this.config.lookAwayThreshold) {
      return true;
    }

    // Check if in center zone
    return estimation.zone !== 'center';
  }

  private determineDirection(estimation: EnhancedGazeEstimation): LookingAwayDirection {
    const { gazePoint, deviation } = estimation;
    
    if (deviation < 15) return 'slightly-left'; // This shouldn't happen for looking away
    
    if (Math.abs(gazePoint.x) > Math.abs(gazePoint.y)) {
      // Horizontal looking away
      if (deviation < 45) {
        return gazePoint.x < 0 ? 'slightly-left' : 'slightly-right';
      } else if (deviation < 75) {
        return gazePoint.x < 0 ? 'moderately-left' : 'moderately-right';
      } else {
        return gazePoint.x < 0 ? 'far-left' : 'far-right';
      }
    } else {
      // Vertical looking away
      if (deviation > 90) return 'extreme';
      return gazePoint.y < 0 ? 'up' : 'down';
    }
  }

  private determineSeverity(deviation: number): LookingAwaySeverity {
    if (deviation < 45) return 'minor';
    if (deviation < 75) return 'moderate';
    if (deviation < 120) return 'severe';
    return 'critical';
  }

  private handleLookingAwayStart(
    currentTime: number, 
    direction: LookingAwayDirection, 
    severity: LookingAwaySeverity, 
    estimation: EnhancedGazeEstimation
  ): void {
    // Update status
    this.status.isLookingAway = true;
    this.status.currentDuration = 0;
    this.status.lookingAwayStartTime = currentTime;
    this.status.currentDirection = direction;
    this.status.currentSeverity = severity;

    // Create and emit start event
    const event: LookingAwayEvent = {
      id: `looking_away_start_${currentTime}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: currentTime,
      type: 'looking_away_started',
      duration: 0,
      direction,
      severity,
      confidence: estimation.confidence,
      gazeDeviation: estimation.deviation,
      gazeZone: estimation.zone,
      metadata: {
        returnedToCenter: false
      }
    };

    this.addEvent(event);
    
    if (this.onLookingAwayStart) {
      this.onLookingAwayStart(event);
    }
  }

  private handleLookingAwayEnd(currentTime: number, estimation: EnhancedGazeEstimation): void {
    if (!this.status.lookingAwayStartTime) return;

    const duration = currentTime - this.status.lookingAwayStartTime;
    
    // Update cumulative time
    this.status.cumulativeDuration += duration;

    // Create end event
    const event: LookingAwayEvent = {
      id: `looking_away_end_${currentTime}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: currentTime,
      type: 'looking_away_ended',
      duration,
      direction: this.status.currentDirection || 'slightly-left',
      severity: this.status.currentSeverity,
      confidence: estimation.confidence,
      gazeDeviation: estimation.deviation,
      gazeZone: estimation.zone,
      metadata: {
        returnedToCenter: estimation.zone === 'center',
        averageDeviation: estimation.deviation // Could be calculated over the episode
      }
    };

    // Add to patterns
    this.patterns.episodes.push({
      startTime: this.status.lookingAwayStartTime,
      endTime: currentTime,
      duration,
      direction: this.status.currentDirection || 'slightly-left',
      severity: this.status.currentSeverity,
      scored: duration >= this.config.scoringThreshold
    });

    this.addEvent(event);

    // Reset status
    this.status.isLookingAway = false;
    this.status.currentDuration = 0;
    this.status.lookingAwayStartTime = null;
    this.status.currentDirection = null;
    this.status.currentSeverity = 'minor';

    if (this.onLookingAwayEnd) {
      this.onLookingAwayEnd(event);
    }
  }

  private handleLookingAwayContinue(
    currentTime: number, 
    direction: LookingAwayDirection, 
    severity: LookingAwaySeverity, 
    estimation: EnhancedGazeEstimation
  ): void {
    if (!this.status.lookingAwayStartTime) return;

    const duration = currentTime - this.status.lookingAwayStartTime;
    this.status.currentDuration = duration;
    this.status.currentDirection = direction;
    this.status.currentSeverity = severity;

    // Check if we should award points
    if (this.shouldAwardPoints(currentTime, duration)) {
      this.awardPoints(currentTime, duration, direction, severity, estimation);
    }
  }

  private shouldAwardPoints(currentTime: number, duration: number): boolean {
    // Must exceed scoring threshold
    if (duration < this.config.scoringThreshold) return false;

    // Check if we already scored for this episode recently
    const timeSinceLastScoring = this.status.lastScoringTime ? 
      currentTime - this.status.lastScoringTime : Infinity;

    // Award points every 5 seconds of sustained looking away
    return timeSinceLastScoring >= this.config.scoringThreshold;
  }

  private awardPoints(
    currentTime: number, 
    duration: number, 
    direction: LookingAwayDirection, 
    severity: LookingAwaySeverity,
    estimation: EnhancedGazeEstimation
  ): void {
    const points = this.config.pointsPerScoringEvent;
    
    this.status.scoringEvents++;
    this.status.totalPointsAwarded += points;
    this.status.lastScoringTime = currentTime;

    // Create scoring event
    const event: LookingAwayEvent = {
      id: `looking_away_scored_${currentTime}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: currentTime,
      type: 'looking_away_scored',
      duration,
      direction,
      severity,
      confidence: estimation.confidence,
      gazeDeviation: estimation.deviation,
      gazeZone: estimation.zone,
      pointsAwarded: points,
      metadata: {
        averageDeviation: estimation.deviation,
        maxDeviation: estimation.deviation // Could track max over episode
      }
    };

    this.addEvent(event);

    if (this.onLookingAwayScoring) {
      this.onLookingAwayScoring(event);
    }
  }

  private shouldTriggerScoring(currentTime: number): boolean {
    return this.status.isLookingAway && 
           this.status.currentDuration >= this.config.scoringThreshold &&
           this.shouldAwardPoints(currentTime, this.status.currentDuration);
  }

  private generateTimerState(currentTime: number): LookingAwayTimerState {
    if (!this.status.isLookingAway || !this.status.lookingAwayStartTime) {
      return {
        isActive: false,
        currentTime: 0,
        progressToScoring: 0,
        timeToScoring: 0,
        severity: 'minor',
        shouldShowWarning: false
      };
    }

    const duration = currentTime - this.status.lookingAwayStartTime;
    const progress = Math.min(duration / this.config.scoringThreshold, 1);
    const timeToScoring = Math.max(0, this.config.scoringThreshold - duration);

    return {
      isActive: true,
      currentTime: duration,
      progressToScoring: progress,
      timeToScoring,
      severity: this.status.currentSeverity,
      shouldShowWarning: progress > 0.5 // Show warning at 50% progress
    };
  }

  private generateWarning(currentTime: number): LookingAwayWarning | null {
    if (!this.status.isLookingAway || !this.status.lookingAwayStartTime) {
      return null;
    }

    const duration = currentTime - this.status.lookingAwayStartTime;
    const timeToScoring = this.config.scoringThreshold - duration;
    const progress = duration / this.config.scoringThreshold;

    if (progress < 0.5) return null; // No warning yet

    let level: LookingAwayWarning['level'] = 'info';
    let message = 'Looking away detected';
    let color = '#17a2b8';
    let icon = '👁️';

    if (progress >= 0.9) {
      level = 'critical';
      message = 'Scoring in progress!';
      color = '#dc3545';
      icon = '⚠️';
    } else if (progress >= 0.8) {
      level = 'danger';
      message = `Scoring in ${(timeToScoring / 1000).toFixed(1)}s`;
      color = '#dc3545';
      icon = '🚨';
    } else if (progress >= 0.6) {
      level = 'warning';
      message = `Return attention to screen`;
      color = '#ffc107';
      icon = '⚡';
    }

    return {
      level,
      message,
      timeRemaining: Math.max(0, timeToScoring),
      showCountdown: timeToScoring > 0 && timeToScoring < 10000, // Show countdown in last 10 seconds
      color,
      icon
    };
  }

  private updateStats(): void {
    // Update patterns
    this.patterns.totalEpisodes = this.patterns.episodes.length;
    this.patterns.scoringEpisodes = this.patterns.episodes.filter(e => e.scored).length;
    
    if (this.patterns.episodes.length > 0) {
      this.patterns.averageEpisodeDuration = 
        this.patterns.episodes.reduce((sum, e) => sum + e.duration, 0) / this.patterns.episodes.length;
      this.patterns.maxEpisodeDuration = 
        Math.max(...this.patterns.episodes.map(e => e.duration));
      this.patterns.lastEpisodeTime = 
        Math.max(...this.patterns.episodes.map(e => e.endTime));
    }

    // Update main stats
    this.stats.totalLookingAwayTime = this.status.cumulativeDuration;
    this.stats.scoringEvents = this.status.scoringEvents;
    this.stats.totalPointsAwarded = this.status.totalPointsAwarded;
    this.stats.averageEpisodeDuration = this.patterns.averageEpisodeDuration;
    this.stats.maxContinuousDuration = this.patterns.maxEpisodeDuration;
    this.stats.patterns = { ...this.patterns };

    // Calculate frequency (episodes per minute)
    const sessionDuration = (Date.now() - this.stats.sessionStartTime) / 60000; // minutes
    this.stats.lookingAwayFrequency = sessionDuration > 0 ? 
      this.patterns.totalEpisodes / sessionDuration : 0;

    // Find common direction
    if (this.patterns.episodes.length > 0) {
      const directionCounts: Record<string, number> = {};
      this.patterns.episodes.forEach(episode => {
        directionCounts[episode.direction] = (directionCounts[episode.direction] || 0) + 1;
      });
      
      const mostCommon = Object.entries(directionCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      this.stats.commonDirection = mostCommon ? mostCommon[0] as LookingAwayDirection : null;
      this.patterns.frequentDirection = this.stats.commonDirection;
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  private addEvent(event: LookingAwayEvent): void {
    this.recentEvents.push(event);
    this.status.lastEvent = event;

    // Keep only recent events
    if (this.recentEvents.length > 100) {
      this.recentEvents = this.recentEvents.slice(-50);
    }
  }

  public getStatus(): LookingAwayStatus {
    return { ...this.status };
  }

  public getStats(): LookingAwayStats {
    return { ...this.stats };
  }

  public getConfig(): LookingAwayConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<LookingAwayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public reset(): void {
    this.status = this.createInitialStatus();
    this.stats = this.createInitialStats();
    this.patterns = this.createInitialPatterns();
    this.recentEvents = [];
    this.frameCount = 0;
    this.lastProcessTime = 0;
  }

  private handleError(error: Error, context?: string): void {
    console.error(`LookingAwayDetector error${context ? ` (${context})` : ''}:`, error);
    if (this.onError) {
      this.onError(error, context);
    }
  }
}