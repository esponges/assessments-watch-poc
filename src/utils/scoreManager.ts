import type { MonitoringEvent } from '../types/events';
import type {
  ScoringConfig,
  ScoreChange,
  Flag,
  ScoreHistoryEntry,
  ScoringStats,
  ScoringSummary,
  ScoreManagerState,
  ScoreCalculationResult,
  ScoreManagerOptions
} from '../types/scoring';
import { DEFAULT_SCORING_CONFIG, DEFAULT_SCORE_MANAGER_STATE } from '../types/scoring';

export class ScoreManager {
  private state: ScoreManagerState;
  private onScoreChangeCallback?: (change: ScoreChange, stats: ScoringStats) => void;
  private onFlagRaisedCallback?: (flag: Flag, stats: ScoringStats) => void;
  private onErrorCallback?: (error: Error, context?: string) => void;
  private decayInterval?: number;

  constructor(options: ScoreManagerOptions = {}) {
    this.state = {
      ...DEFAULT_SCORE_MANAGER_STATE,
      config: { ...DEFAULT_SCORING_CONFIG, ...options.config },
      sessionId: options.sessionId || this.generateSessionId()
    };

    this.onScoreChangeCallback = options.onScoreChange;
    this.onFlagRaisedCallback = options.onFlagRaised;
    this.onErrorCallback = options.onError;

    if (options.autoStart) {
      this.startSession();
    }
  }

  public startSession(): void {
    try {
      this.state.isActive = true;
      this.state.sessionStartTime = Date.now();
      this.state.sessionId = this.generateSessionId();

      // Reset stats for new session
      this.resetStats();

      // Start score decay if enabled
      if (this.state.config.scoreDecayEnabled) {
        this.startScoreDecay();
      }

      console.log(`Score Manager session started: ${this.state.sessionId}`);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'startSession');
    }
  }

  public endSession(): ScoringSummary {
    try {
      this.state.isActive = false;
      
      if (this.decayInterval) {
        clearInterval(this.decayInterval);
        this.decayInterval = undefined;
      }

      // Calculate final summary
      this.updateSummary();
      
      // Update session duration
      if (this.state.sessionStartTime) {
        this.state.stats.sessionDuration = Date.now() - this.state.sessionStartTime;
      }

      console.log(`Score Manager session ended: ${this.state.sessionId}`, this.state.summary);
      
      return this.state.summary;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'endSession');
      return this.state.summary;
    }
  }

  public processEvent(event: MonitoringEvent): ScoreCalculationResult | null {
    if (!this.state.isActive) {
      return null;
    }

    try {
      let result: ScoreCalculationResult | null = null;

      switch (event.type) {
        case 'multiple_faces_detected':
          result = this.handleMultipleFacesEvent(event);
          break;
        case 'looking_away_extended':
          result = this.handleLookingAwayEvent(event);
          break;
        default:
          // Other events don't contribute to scoring yet
          return null;
      }

      if (result && result.pointsAwarded > 0) {
        this.applyScoreChange(event, result);
      }

      return result;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'processEvent');
      return null;
    }
  }

  private handleMultipleFacesEvent(event: MonitoringEvent): ScoreCalculationResult {
    const pointsAwarded = this.state.config.multipleFacePoints;
    const shouldFlag = this.state.stats.currentScore + pointsAwarded >= this.state.config.flagThreshold;
    
    return {
      pointsAwarded,
      reason: `Multiple faces detected (+${pointsAwarded} points)`,
      shouldFlag,
      flagLevel: shouldFlag ? this.calculateFlagLevel(this.state.stats.currentScore + pointsAwarded) : undefined,
      flagReason: shouldFlag ? 'Multiple faces detected during assessment' : undefined,
      confidence: event.confidence
    };
  }

  private handleLookingAwayEvent(event: MonitoringEvent): ScoreCalculationResult {
    if (event.type !== 'looking_away_extended') {
      return { pointsAwarded: 0, reason: 'Not a looking away event', shouldFlag: false, confidence: 0 };
    }

    // Check if duration meets threshold (5+ seconds per spec)
    const duration = event.duration || 0;
    if (duration < this.state.config.lookingAwayThreshold) {
      return { pointsAwarded: 0, reason: 'Looking away duration below threshold', shouldFlag: false, confidence: event.confidence };
    }

    const pointsAwarded = this.state.config.lookingAwayPoints;
    const shouldFlag = this.state.stats.currentScore + pointsAwarded >= this.state.config.flagThreshold;

    return {
      pointsAwarded,
      reason: `Looking away for ${Math.round(duration / 1000)}s (+${pointsAwarded} points)`,
      shouldFlag,
      flagLevel: shouldFlag ? this.calculateFlagLevel(this.state.stats.currentScore + pointsAwarded) : undefined,
      flagReason: shouldFlag ? `Extended looking away (${Math.round(duration / 1000)} seconds)` : undefined,
      confidence: event.confidence
    };
  }

  private applyScoreChange(event: MonitoringEvent, result: ScoreCalculationResult): void {
    const previousScore = this.state.stats.currentScore;
    const newScore = Math.min(previousScore + result.pointsAwarded, this.state.config.maxScore);
    
    const scoreChange: ScoreChange = {
      id: this.generateId(),
      timestamp: Date.now(),
      previousScore,
      newScore,
      pointsChanged: result.pointsAwarded,
      reason: result.reason,
      triggeringEvent: event.id,
      eventType: event.type,
      confidence: result.confidence
    };

    // Update stats
    this.state.stats.currentScore = newScore;
    this.state.stats.totalPointsAwarded += result.pointsAwarded;
    this.state.stats.scoreChangeCount += 1;
    this.state.stats.maxScoreReached = Math.max(this.state.stats.maxScoreReached, newScore);
    
    // Update event contributions
    this.updateEventContributions(event.type, result.pointsAwarded);
    
    // Add to history
    this.state.stats.scoreHistory.push({
      timestamp: scoreChange.timestamp,
      score: newScore,
      event,
      change: scoreChange
    });

    // Calculate average score
    this.updateAverageScore();

    // Check for flagging
    if (result.shouldFlag && result.flagLevel && result.flagReason) {
      this.raiseFlag(result.flagLevel, result.flagReason, [event.id], scoreChange.timestamp);
    }

    // Trigger callback
    if (this.onScoreChangeCallback) {
      this.onScoreChangeCallback(scoreChange, { ...this.state.stats });
    }

    console.log(`Score updated: ${previousScore} → ${newScore} (${result.reason})`);
  }

  private updateEventContributions(eventType: MonitoringEvent['type'], points: number): void {
    switch (eventType) {
      case 'multiple_faces_detected':
        this.state.stats.eventContributions.multipleFaces.events += 1;
        this.state.stats.eventContributions.multipleFaces.totalPoints += points;
        this.state.stats.eventContributions.multipleFaces.averagePoints = 
          this.state.stats.eventContributions.multipleFaces.totalPoints / 
          this.state.stats.eventContributions.multipleFaces.events;
        break;
      case 'looking_away_extended':
        this.state.stats.eventContributions.lookingAway.events += 1;
        this.state.stats.eventContributions.lookingAway.totalPoints += points;
        this.state.stats.eventContributions.lookingAway.averagePoints = 
          this.state.stats.eventContributions.lookingAway.totalPoints / 
          this.state.stats.eventContributions.lookingAway.events;
        break;
      default:
        this.state.stats.eventContributions.other.events += 1;
        this.state.stats.eventContributions.other.totalPoints += points;
        this.state.stats.eventContributions.other.averagePoints = 
          this.state.stats.eventContributions.other.totalPoints / 
          this.state.stats.eventContributions.other.events;
        break;
    }
  }

  private calculateFlagLevel(score: number): Flag['level'] {
    if (score >= 20) return 'critical';
    if (score >= 15) return 'high';
    if (score >= this.state.config.flagThreshold) return 'medium';
    return 'low';
  }

  private raiseFlag(level: Flag['level'], reason: string, triggeringEvents: string[], timestamp: number): void {
    const flag: Flag = {
      id: this.generateId(),
      timestamp,
      level,
      reason,
      score: this.state.stats.currentScore,
      triggeringEvents,
      isActive: true,
      priority: this.calculateFlagPriority(level, this.state.stats.currentScore),
      category: this.determineFlagCategory(triggeringEvents[0])
    };

    this.state.stats.flags.push(flag);
    this.state.summary.totalFlags += 1;
    this.state.summary.flagsByLevel[level] += 1;
    this.state.summary.flagged = true;

    // Update highest flag
    if (!this.state.summary.highestFlag || this.compareFlagPriority(flag, this.state.summary.highestFlag) > 0) {
      this.state.summary.highestFlag = flag;
    }

    // Update risk level
    this.updateRiskLevel();
    
    // Update summary
    this.updateSummary();

    // Trigger callback
    if (this.onFlagRaisedCallback) {
      this.onFlagRaisedCallback(flag, { ...this.state.stats });
    }

    console.log(`Flag raised: ${level} - ${reason} (Score: ${this.state.stats.currentScore})`);
  }

  private calculateFlagPriority(level: Flag['level'], score: number): number {
    const baseValue = {
      low: 2,
      medium: 5,
      high: 8,
      critical: 10
    }[level];

    // Scale priority based on score
    const scoreMultiplier = Math.min(score / 10, 2); // Max 2x multiplier
    return Math.round(baseValue * scoreMultiplier);
  }

  private determineFlagCategory(triggeringEventId: string): Flag['category'] {
    // In a real implementation, we'd look up the event by ID
    // For now, we'll use a simple heuristic
    return 'composite';
  }

  private compareFlagPriority(flag1: Flag, flag2: Flag): number {
    return flag1.priority - flag2.priority;
  }

  private updateRiskLevel(): void {
    const score = this.state.stats.currentScore;
    if (score >= 20) {
      this.state.summary.riskLevel = 'critical';
    } else if (score >= 15) {
      this.state.summary.riskLevel = 'high';
    } else if (score >= this.state.config.flagThreshold) {
      this.state.summary.riskLevel = 'medium';
    } else {
      this.state.summary.riskLevel = 'low';
    }
  }

  private updateAverageScore(): void {
    if (this.state.stats.scoreHistory.length === 0) {
      this.state.stats.averageScore = 0;
      return;
    }

    const sum = this.state.stats.scoreHistory.reduce((acc, entry) => acc + entry.score, 0);
    this.state.stats.averageScore = sum / this.state.stats.scoreHistory.length;
  }

  private updateSummary(): void {
    this.state.summary.finalScore = this.state.stats.currentScore;
    
    // Generate recommendations
    this.state.summary.recommendations = this.generateRecommendations();
    
    // Generate key issues
    this.state.summary.keyIssues = this.generateKeyIssues();
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { stats } = this.state;

    if (stats.currentScore >= this.state.config.flagThreshold) {
      recommendations.push('Assessment requires manual review due to elevated suspicious activity score');
    }

    if (stats.eventContributions.multipleFaces.events > 0) {
      recommendations.push('Multiple instances of additional people detected - verify assessment integrity');
    }

    if (stats.eventContributions.lookingAway.events >= 3) {
      recommendations.push('Frequent looking away detected - review for potential note consultation');
    }

    if (stats.flags.length === 0 && stats.currentScore < 3) {
      recommendations.push('Assessment completed without significant monitoring alerts');
    }

    return recommendations;
  }

  private generateKeyIssues(): string[] {
    const issues: string[] = [];
    const { stats } = this.state;

    if (stats.eventContributions.multipleFaces.events > 0) {
      issues.push(`${stats.eventContributions.multipleFaces.events} multiple person detection(s)`);
    }

    if (stats.eventContributions.lookingAway.events > 0) {
      issues.push(`${stats.eventContributions.lookingAway.events} extended looking away incident(s)`);
    }

    stats.flags.forEach(flag => {
      if (flag.level === 'high' || flag.level === 'critical') {
        issues.push(flag.reason);
      }
    });

    return issues;
  }

  private startScoreDecay(): void {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }

    this.decayInterval = window.setInterval(() => {
      if (this.state.isActive && this.state.stats.currentScore > 0) {
        const decayAmount = this.state.config.scoreDecayRate;
        const newScore = Math.max(0, this.state.stats.currentScore - decayAmount);
        
        if (newScore !== this.state.stats.currentScore) {
          this.state.stats.currentScore = newScore;
          this.state.stats.totalPointsLost += decayAmount;
          
          console.log(`Score decay applied: -${decayAmount} points (now ${newScore})`);
        }
      }
    }, 60000); // Every minute
  }

  private resetStats(): void {
    this.state.stats = {
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
    };

    this.state.summary = {
      finalScore: 0,
      flagged: false,
      highestFlag: null,
      totalFlags: 0,
      flagsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      riskLevel: 'low',
      recommendations: [],
      keyIssues: []
    };
  }

  private generateSessionId(): string {
    return `score_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(error: Error, context?: string): void {
    console.error(`ScoreManager error${context ? ` (${context})` : ''}:`, error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error, context);
    }
  }

  // Public getters
  public getState(): ScoreManagerState {
    return { ...this.state };
  }

  public getStats(): ScoringStats {
    return { ...this.state.stats };
  }

  public getSummary(): ScoringSummary {
    return { ...this.state.summary };
  }

  public getCurrentScore(): number {
    return this.state.stats.currentScore;
  }

  public getFlags(): Flag[] {
    return [...this.state.stats.flags];
  }

  public isSessionActive(): boolean {
    return this.state.isActive;
  }

  public updateConfig(newConfig: Partial<ScoringConfig>): void {
    this.state.config = { ...this.state.config, ...newConfig };
    console.log('Score manager configuration updated:', this.state.config);
  }

  public reset(): void {
    this.resetStats();
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = undefined;
    }
    console.log('Score manager reset');
  }
}
