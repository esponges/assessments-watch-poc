import type { FaceCountEvent, FaceCountStatus } from '../types/faceCounter';
import type {
  MultiplePersonDetectorConfig,
  MultiplePersonDetectorOptions,
  MultiplePersonDetectorStats,
  MultiplePersonEvent,
  MultiplePersonDetectionStatus,
  ScoreEvent,
  ScoreStatus,
  ScoreConfig
} from '../types/multiplePersonDetector';

export class MultiplePersonDetector {
  private config: MultiplePersonDetectorConfig;
  private scoreStatus: ScoreStatus;
  private detectionStatus: MultiplePersonDetectionStatus;
  private stats: MultiplePersonDetectorStats;
  private onScoreChange?: (scoreStatus: ScoreStatus) => void;
  private onMultiplePersonEvent?: (event: MultiplePersonEvent) => void;
  private onError?: (error: Error, context?: string) => void;
  private glitchFilterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: MultiplePersonDetectorOptions = {}) {
    this.config = this.createDefaultConfig(options.config);
    this.onScoreChange = options.onScoreChange;
    this.onMultiplePersonEvent = options.onMultiplePersonEvent;
    this.onError = options.onError;

    this.scoreStatus = {
      totalScore: 0,
      isFlagged: false,
      flagLevel: 'none',
      scoreHistory: []
    };

    this.detectionStatus = {
      isMultiplePersonsDetected: false,
      faceCount: 0,
      confidence: 0,
      detectionStartTime: null,
      currentDuration: 0,
      isSustained: false
    };

    this.stats = {
      totalDetections: 0,
      sustainedDetections: 0,
      averageDetectionDuration: 0,
      maxSimultaneousFaces: 0,
      totalPointsAwarded: 0,
      detectionConfidenceAverage: 0,
      sessionStartTime: Date.now()
    };
  }

  private createDefaultConfig(customConfig?: Partial<MultiplePersonDetectorConfig>): MultiplePersonDetectorConfig {
    const defaultScoreConfig: ScoreConfig = {
      multipleFacesPoints: 10,
      sustainedMultipleFacesThreshold: 3, // 3 seconds
      sustainedMultipleFacesBonus: 5,
      confidenceThreshold: 0.7,
      temporalValidationWindow: 200 // 200ms
    };

    return {
      scoreConfig: { ...defaultScoreConfig, ...customConfig?.scoreConfig },
      sustainedThresholdMs: 3000, // 3 seconds
      glitchFilterMs: 200, // 200ms
      flaggingThreshold: 8, // 8 points for flagging
      confidenceThreshold: 0.7,
      maxScoreHistory: 100,
      ...customConfig
    };
  }

  public processDetection(detection: FaceCountStatus, _event?: FaceCountEvent): void {
    try {
      // Clear any pending glitch filter
      if (this.glitchFilterTimer) {
        clearTimeout(this.glitchFilterTimer);
        this.glitchFilterTimer = null;
      }

      const currentTime = Date.now();
      const isMultipleFaces = detection.currentCount > 1;
      const hasGoodConfidence = detection.confidence >= this.config.confidenceThreshold;

      // Update stats
      this.stats.maxSimultaneousFaces = Math.max(this.stats.maxSimultaneousFaces, detection.currentCount);
      
      if (isMultipleFaces && hasGoodConfidence) {
        this.handleMultiplePersonDetection(detection, currentTime, _event);
      } else {
        this.handleSingleOrNoPersonDetection(detection, currentTime, _event);
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, 'processDetection');
    }
  }

  private handleMultiplePersonDetection(
    detection: FaceCountStatus, 
    currentTime: number, 
    _event?: FaceCountEvent
  ): void {
    if (!this.detectionStatus.isMultiplePersonsDetected) {
      // Start of multiple person detection
      this.detectionStatus = {
        isMultiplePersonsDetected: true,
        faceCount: detection.currentCount,
        confidence: detection.confidence,
        detectionStartTime: currentTime,
        currentDuration: 0,
        isSustained: false
      };

      this.stats.totalDetections++;

      // Use glitch filter to avoid scoring brief false positives
      this.glitchFilterTimer = setTimeout(() => {
        this.scoreMultipleFaces(detection, currentTime);
        this.emitMultiplePersonEvent('multiple_person_start', detection, currentTime);
      }, this.config.glitchFilterMs);

    } else {
      // Ongoing multiple person detection
      const duration = currentTime - (this.detectionStatus.detectionStartTime || currentTime);
      
      this.detectionStatus.currentDuration = duration;
      this.detectionStatus.faceCount = detection.currentCount;
      this.detectionStatus.confidence = detection.confidence;

      // Check if it has become sustained
      if (!this.detectionStatus.isSustained && duration >= this.config.sustainedThresholdMs) {
        this.detectionStatus.isSustained = true;
        this.stats.sustainedDetections++;
        
        // Award bonus points for sustained detection
        this.scoreMultipleFaces(
          detection, 
          currentTime, 
          this.config.scoreConfig.sustainedMultipleFacesBonus
        );
        
        this.emitMultiplePersonEvent('multiple_person_ongoing', detection, currentTime);
      }
    }
  }

  private handleSingleOrNoPersonDetection(
    detection: FaceCountStatus, 
    currentTime: number, 
    _event?: FaceCountEvent
  ): void {
    if (this.detectionStatus.isMultiplePersonsDetected) {
      // End of multiple person detection
      const totalDuration = currentTime - (this.detectionStatus.detectionStartTime || currentTime);
      
      // Update average detection duration
      const totalPreviousDuration = this.stats.averageDetectionDuration * (this.stats.totalDetections - 1);
      this.stats.averageDetectionDuration = (totalPreviousDuration + totalDuration) / this.stats.totalDetections;

      // Emit end event
      this.emitMultiplePersonEvent('multiple_person_end', detection, currentTime);

      // Reset detection status
      this.detectionStatus = {
        isMultiplePersonsDetected: false,
        faceCount: detection.currentCount,
        confidence: detection.confidence,
        detectionStartTime: null,
        currentDuration: 0,
        isSustained: false
      };
    } else {
      // Update current status without triggering events
      this.detectionStatus.faceCount = detection.currentCount;
      this.detectionStatus.confidence = detection.confidence;
    }
  }

  private scoreMultipleFaces(detection: FaceCountStatus, timestamp: number, bonusPoints = 0): void {
    const points = this.config.scoreConfig.multipleFacesPoints + bonusPoints;
    const previousScore = this.scoreStatus.totalScore;
    const newScore = previousScore + points;

    const scoreEvent: ScoreEvent = {
      id: `score_${timestamp}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp,
      type: bonusPoints > 0 ? 'sustained_multiple_faces' : 'multiple_faces_detected',
      points,
      reason: bonusPoints > 0 
        ? `Sustained multiple faces detected (${detection.currentCount} faces for ${this.detectionStatus.currentDuration/1000}s)`
        : `Multiple faces detected (${detection.currentCount} faces)`,
      confidence: detection.confidence,
      metadata: {
        faceCount: detection.currentCount,
        duration: this.detectionStatus.currentDuration,
        previousScore,
        newScore
      }
    };

    // Update score status
    this.scoreStatus.totalScore = newScore;
    this.scoreStatus.lastScoreEvent = scoreEvent;
    this.scoreStatus.scoreHistory.push(scoreEvent);
    this.stats.totalPointsAwarded += points;

    // Trim history if needed
    if (this.scoreStatus.scoreHistory.length > this.config.maxScoreHistory) {
      this.scoreStatus.scoreHistory = this.scoreStatus.scoreHistory.slice(-this.config.maxScoreHistory);
    }

    // Update flagging status
    this.updateFlaggingStatus();

    // Update confidence average
    const totalConfidence = this.stats.detectionConfidenceAverage * (this.stats.totalDetections - 1) + detection.confidence;
    this.stats.detectionConfidenceAverage = totalConfidence / this.stats.totalDetections;

    // Notify callback
    if (this.onScoreChange) {
      this.onScoreChange({ ...this.scoreStatus });
    }
  }

  private updateFlaggingStatus(): void {
    const score = this.scoreStatus.totalScore;
    const threshold = this.config.flaggingThreshold;

    this.scoreStatus.isFlagged = score >= threshold;
    
    if (score < threshold) {
      this.scoreStatus.flagLevel = 'none';
    } else if (score < threshold * 1.5) {
      this.scoreStatus.flagLevel = 'low';
    } else if (score < threshold * 2) {
      this.scoreStatus.flagLevel = 'medium';
    } else {
      this.scoreStatus.flagLevel = 'high';
    }
  }

  private emitMultiplePersonEvent(
    type: MultiplePersonEvent['type'], 
    detection: FaceCountStatus, 
    timestamp: number
  ): void {
    const event: MultiplePersonEvent = {
      id: `mp_${timestamp}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp,
      type,
      faceCount: detection.currentCount,
      confidence: detection.confidence,
      duration: this.detectionStatus.currentDuration,
      sustained: this.detectionStatus.isSustained,
      metadata: {
        detectionQuality: detection.confidence > 0.8 ? 'high' : detection.confidence > 0.6 ? 'medium' : 'low',
        previousFaceCount: this.detectionStatus.faceCount
      }
    };

    this.detectionStatus.lastEvent = event;

    if (this.onMultiplePersonEvent) {
      this.onMultiplePersonEvent(event);
    }
  }

  public getScoreStatus(): ScoreStatus {
    return { ...this.scoreStatus };
  }

  public getDetectionStatus(): MultiplePersonDetectionStatus {
    return { ...this.detectionStatus };
  }

  public getStats(): MultiplePersonDetectorStats {
    return { ...this.stats };
  }

  public getConfig(): MultiplePersonDetectorConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<MultiplePersonDetectorConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      scoreConfig: {
        ...this.config.scoreConfig,
        ...newConfig.scoreConfig
      }
    };
  }

  public reset(): void {
    // Clear any pending timers
    if (this.glitchFilterTimer) {
      clearTimeout(this.glitchFilterTimer);
      this.glitchFilterTimer = null;
    }

    // Create reset score event
    const resetEvent: ScoreEvent = {
      id: `reset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now(),
      type: 'score_reset',
      points: -this.scoreStatus.totalScore,
      reason: 'Score reset',
      confidence: 0,
      metadata: {
        previousScore: this.scoreStatus.totalScore,
        newScore: 0
      }
    };

    // Reset all state
    this.scoreStatus = {
      totalScore: 0,
      isFlagged: false,
      flagLevel: 'none',
      lastScoreEvent: resetEvent,
      scoreHistory: [resetEvent]
    };

    this.detectionStatus = {
      isMultiplePersonsDetected: false,
      faceCount: 0,
      confidence: 0,
      detectionStartTime: null,
      currentDuration: 0,
      isSustained: false
    };

    this.stats = {
      totalDetections: 0,
      sustainedDetections: 0,
      averageDetectionDuration: 0,
      maxSimultaneousFaces: 0,
      totalPointsAwarded: 0,
      detectionConfidenceAverage: 0,
      sessionStartTime: Date.now()
    };

    // Notify callback
    if (this.onScoreChange) {
      this.onScoreChange({ ...this.scoreStatus });
    }
  }

  public dispose(): void {
    if (this.glitchFilterTimer) {
      clearTimeout(this.glitchFilterTimer);
      this.glitchFilterTimer = null;
    }
  }

  private handleError(error: Error, context?: string): void {
    console.error(`MultiplePersonDetector error${context ? ` (${context})` : ''}:`, error);
    if (this.onError) {
      this.onError(error, context);
    }
  }
}

export const createMultiplePersonDetector = (
  options: MultiplePersonDetectorOptions = {}
): MultiplePersonDetector => {
  return new MultiplePersonDetector(options);
};