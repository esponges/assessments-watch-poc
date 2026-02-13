import type { FaceDetectionResult } from '../types/faceDetection';
import type {
  FaceCountConfig,
  FaceCountEvent,
  FaceCountData,
  FaceCountStats,
  FaceCountHistory,
  FaceCounterOptions,
  FaceCountStatus
} from '../types/faceCounter';

const DEFAULT_CONFIG: FaceCountConfig = {
  confidenceThreshold: 0.7, // 70% confidence minimum
  smoothingWindow: 3, // Smooth over 3 frames
  stableCountThreshold: 5, // 5 consecutive frames for stable count
  alertSensitivity: 0.8, // High sensitivity for multiple faces
  maxFaceTrackingDistance: 50 // Pixels for tracking same face
};

export class FaceCounter {
  private config: FaceCountConfig;
  private history: FaceCountHistory;
  private stats: FaceCountStats;
  private currentStatus: FaceCountStatus;
  private stabilityCounter: number = 0;
  private lastStableCount: number = 0;
  private activeEvents: Map<string, FaceCountEvent> = new Map();
  private eventCounter: number = 0;

  constructor(private options: FaceCounterOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    
    this.history = {
      data: [],
      maxHistory: 100 // Keep last 100 data points
    };

    this.stats = {
      totalFrames: 0,
      averageFaceCount: 0,
      maxFaceCount: 0,
      multipleFaceDetections: 0,
      noFaceDetections: 0,
      singleFaceDetections: 0,
      currentStability: 0,
      sessionStartTime: Date.now()
    };

    this.currentStatus = {
      currentCount: 0,
      smoothedCount: 0,
      isStable: false,
      confidence: 0,
      status: 'uncertain'
    };
  }

  processDetection(detection: FaceDetectionResult): FaceCountStatus {
    const timestamp = detection.timestamp;
    
    // Count faces above confidence threshold
    const reliableFaces = detection.faces.filter(
      face => face.confidence >= this.config.confidenceThreshold
    );
    
    const rawCount = reliableFaces.length;
    const avgConfidence = reliableFaces.length > 0 
      ? reliableFaces.reduce((sum, face) => sum + face.confidence, 0) / reliableFaces.length
      : 0;

    // Calculate smoothed count using recent history
    const smoothedCount = this.calculateSmoothedCount(rawCount);
    
    // Update stability tracking
    const isStable = this.updateStability(smoothedCount);
    
    // Create face count data
    const countData: FaceCountData = {
      timestamp,
      rawCount,
      smoothedCount,
      confidence: avgConfidence,
      isStable
    };

    // Update history
    this.updateHistory(countData);
    
    // Update statistics
    this.updateStats(countData);
    
    // Check for events
    this.checkForEvents(countData);
    
    // Update current status
    this.currentStatus = {
      currentCount: rawCount,
      smoothedCount,
      isStable,
      confidence: avgConfidence,
      status: this.determineStatus(smoothedCount, avgConfidence, isStable)
    };

    // Trigger callbacks
    this.options.onStatsUpdate?.(this.stats);

    return this.currentStatus;
  }

  private calculateSmoothedCount(rawCount: number): number {
    if (this.history.data.length === 0) {
      return rawCount;
    }

    // Get recent counts for smoothing
    const recentCounts = this.history.data
      .slice(-this.config.smoothingWindow)
      .map(data => data.rawCount);
    
    recentCounts.push(rawCount);

    // Use median for robust smoothing
    const sortedCounts = [...recentCounts].sort((a, b) => a - b);
    const middle = Math.floor(sortedCounts.length / 2);
    
    if (sortedCounts.length % 2 === 0) {
      return Math.round((sortedCounts[middle - 1] + sortedCounts[middle]) / 2);
    } else {
      return sortedCounts[middle];
    }
  }

  private updateStability(smoothedCount: number): boolean {
    if (smoothedCount === this.lastStableCount) {
      this.stabilityCounter++;
    } else {
      this.stabilityCounter = 1;
      this.lastStableCount = smoothedCount;
    }

    this.stats.currentStability = this.stabilityCounter;
    return this.stabilityCounter >= this.config.stableCountThreshold;
  }

  private updateHistory(data: FaceCountData): void {
    this.history.data.push(data);
    
    // Keep only recent history
    if (this.history.data.length > this.history.maxHistory) {
      this.history.data.shift();
    }
  }

  private updateStats(data: FaceCountData): void {
    this.stats.totalFrames++;
    this.stats.maxFaceCount = Math.max(this.stats.maxFaceCount, data.rawCount);

    // Update detection type counters
    if (data.rawCount === 0) {
      this.stats.noFaceDetections++;
    } else if (data.rawCount === 1) {
      this.stats.singleFaceDetections++;
    } else {
      this.stats.multipleFaceDetections++;
    }

    // Calculate running average face count
    const totalFaces = this.history.data.reduce((sum, d) => sum + d.rawCount, 0);
    this.stats.averageFaceCount = totalFaces / this.history.data.length;
  }

  private checkForEvents(data: FaceCountData): void {
    if (!data.isStable) {
      return; // Only trigger events for stable counts
    }

    const currentSmoothedCount = data.smoothedCount;
    const previousSmoothedCount = this.currentStatus.smoothedCount;

    // Check for count changes
    if (currentSmoothedCount !== previousSmoothedCount && this.stats.totalFrames > 1) {
      this.triggerEvent({
        eventType: 'count_change',
        previousCount: previousSmoothedCount,
        currentCount: currentSmoothedCount,
        confidence: data.confidence
      });
    }

    // Check for specific conditions
    if (currentSmoothedCount > 1 && previousSmoothedCount <= 1) {
      this.triggerEvent({
        eventType: 'multiple_faces_detected',
        previousCount: previousSmoothedCount,
        currentCount: currentSmoothedCount,
        confidence: data.confidence
      });
    } else if (currentSmoothedCount === 1 && previousSmoothedCount > 1) {
      this.triggerEvent({
        eventType: 'single_face_restored',
        previousCount: previousSmoothedCount,
        currentCount: currentSmoothedCount,
        confidence: data.confidence
      });
    } else if (currentSmoothedCount === 0 && previousSmoothedCount > 0) {
      this.triggerEvent({
        eventType: 'no_faces_detected',
        previousCount: previousSmoothedCount,
        currentCount: currentSmoothedCount,
        confidence: data.confidence
      });
    }
  }

  private triggerEvent(eventData: Partial<FaceCountEvent>): void {
    const event: FaceCountEvent = {
      id: `event_${this.eventCounter++}_${Date.now()}`,
      timestamp: Date.now(),
      eventType: eventData.eventType!,
      previousCount: eventData.previousCount!,
      currentCount: eventData.currentCount!,
      confidence: eventData.confidence!,
      ...eventData
    };

    this.currentStatus.lastEvent = event;

    // Store active events for duration tracking
    if (event.eventType === 'multiple_faces_detected') {
      this.activeEvents.set('multiple_faces', event);
    } else if (event.eventType === 'single_face_restored' && this.activeEvents.has('multiple_faces')) {
      const startEvent = this.activeEvents.get('multiple_faces')!;
      event.duration = event.timestamp - startEvent.timestamp;
      this.activeEvents.delete('multiple_faces');
    }

    // Trigger callback
    if (this.options.onCountChange) {
      try {
        const result = this.options.onCountChange(event);
        if (result instanceof Promise) {
          result.catch(error => {
            console.error('Face count event callback error:', error);
            this.options.onError?.(error);
          });
        }
      } catch (error) {
        console.error('Face count event callback error:', error);
        this.options.onError?.(error as Error);
      }
    }

    console.log('Face count event:', event);
  }

  private determineStatus(smoothedCount: number, confidence: number, isStable: boolean): FaceCountStatus['status'] {
    if (!isStable || confidence < this.config.confidenceThreshold) {
      return 'uncertain';
    }

    if (smoothedCount === 0) {
      return 'no_faces';
    } else if (smoothedCount === 1) {
      return 'normal';
    } else {
      return 'multiple_faces';
    }
  }

  updateConfig(newConfig: Partial<FaceCountConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Face counter config updated:', this.config);
  }

  getConfig(): FaceCountConfig {
    return { ...this.config };
  }

  getStats(): FaceCountStats {
    return { ...this.stats };
  }

  getHistory(): FaceCountData[] {
    return [...this.history.data];
  }

  getCurrentStatus(): FaceCountStatus {
    return { ...this.currentStatus };
  }

  reset(): void {
    this.history.data = [];
    this.stabilityCounter = 0;
    this.lastStableCount = 0;
    this.activeEvents.clear();
    this.eventCounter = 0;
    
    this.stats = {
      totalFrames: 0,
      averageFaceCount: 0,
      maxFaceCount: 0,
      multipleFaceDetections: 0,
      noFaceDetections: 0,
      singleFaceDetections: 0,
      currentStability: 0,
      sessionStartTime: Date.now()
    };

    this.currentStatus = {
      currentCount: 0,
      smoothedCount: 0,
      isStable: false,
      confidence: 0,
      status: 'uncertain'
    };

    console.log('Face counter reset');
  }
}

export const createFaceCounter = (options?: FaceCounterOptions): FaceCounter => {
  return new FaceCounter(options);
};