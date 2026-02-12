import type { MonitoringEvent } from '../types/events';
import type { ScoringStats, Flag } from '../types/scoring';
import type {
  AssessmentSession,
  AssessmentLogEntry,
  AssessmentEventEntry,
  AssessmentFlagEntry,
  SessionState,
  AssessmentLoggerConfig,
  AssessmentLoggerOptions,
  AssessmentLogExport,
  LogValidationResult,
} from '../types/assessmentLogging';
import { DEFAULT_ASSESSMENT_LOGGER_CONFIG } from '../types/assessmentLogging';

export class AssessmentLogger {
  private config: AssessmentLoggerConfig;
  private state: SessionState | null = null;
  private onLogGeneratedCallback?: (log: AssessmentLogEntry) => void;
  private onErrorCallback?: (error: Error, context?: string) => void;
  private realTimeLogTimer?: number;

  constructor(options: AssessmentLoggerOptions = {}) {
    this.config = { ...DEFAULT_ASSESSMENT_LOGGER_CONFIG, ...options.config };
    this.onLogGeneratedCallback = options.onLogGenerated;
    this.onErrorCallback = options.onError;

    if (options.autoStart) {
      this.startSession(options.assessmentId, options.studentId);
    }
  }

  public startSession(assessmentId?: string, studentId?: string): string {
    try {
      const sessionId = this.generateSessionId();
      const now = Date.now();

      const session: AssessmentSession = {
        assessmentId: assessmentId || this.generateAssessmentId(),
        studentId: studentId || this.generateStudentId(),
        sessionId,
        startTimestamp: now,
        userAgent: navigator.userAgent,
        screenResolution: {
          width: window.screen.width,
          height: window.screen.height
        },
        metadata: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform
        }
      };

      this.state = {
        session,
        events: [],
        flags: [],
        scoringStats: null,
        isActive: true,
        startTime: now,
        lastEventTime: now,
        totalDuration: 0,
        continuousMonitoring: true,
        interruptions: 0
      };

      // Start real-time logging if enabled
      if (this.config.enableRealTimeLogging) {
        this.startRealTimeLogging();
      }

      console.log('Assessment logger session started:', sessionId);
      return sessionId;

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'startSession');
      throw error;
    }
  }

  public endSession(): AssessmentLogEntry {
    if (!this.state) {
      throw new Error('No active session to end');
    }

    try {
      const now = Date.now();
      
      // Stop real-time logging
      if (this.realTimeLogTimer) {
        clearInterval(this.realTimeLogTimer);
        this.realTimeLogTimer = undefined;
      }

      // Update session end time
      this.state.session.endTimestamp = now;
      this.state.session.duration = now - this.state.session.startTimestamp;
      this.state.totalDuration = this.state.session.duration;
      this.state.isActive = false;

      // Generate final log entry
      const logEntry = this.generateLogEntry();

      // Validate the log entry
      if (this.config.validateJsonSchema) {
        const validation = this.validateLogEntry(logEntry);
        if (!validation.isValid) {
          console.warn('Generated log entry has validation warnings:', validation.warnings);
          if (validation.errors.length > 0) {
            throw new Error(`Log validation failed: ${validation.errors.join(', ')}`);
          }
        }
      }

      // Trigger callback
      if (this.onLogGeneratedCallback) {
        this.onLogGeneratedCallback(logEntry);
      }

      console.log('Assessment session ended:', this.state.session.sessionId, logEntry);
      return logEntry;

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'endSession');
      throw error;
    }
  }

  public addEvent(event: MonitoringEvent): void {
    if (!this.state || !this.state.isActive) {
      return;
    }

    try {
      const now = Date.now();

      // Check for event deduplication
      if (this.config.eventDeduplication && this.isDuplicateEvent(event)) {
        return;
      }

      // Add event to state
      this.state.events.push(event);
      this.state.lastEventTime = now;

      // Update monitoring continuity
      if (now - this.state.lastEventTime > 5000) { // 5 second gap
        this.state.continuousMonitoring = false;
        this.state.interruptions += 1;
      }

      // Manage event history size
      if (this.state.events.length > this.config.maxEventHistory) {
        this.state.events = this.state.events.slice(-this.config.maxEventHistory);
      }

      console.log('Event added to assessment log:', event.type, event.id);

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'addEvent');
    }
  }

  public addFlag(flag: Flag): void {
    if (!this.state || !this.state.isActive) {
      return;
    }

    try {
      this.state.flags.push(flag);
      console.log('Flag added to assessment log:', flag.level, flag.reason);

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'addFlag');
    }
  }

  public updateScoringStats(stats: ScoringStats): void {
    if (!this.state || !this.state.isActive) {
      return;
    }

    this.state.scoringStats = stats;
  }

  public getCurrentLog(): AssessmentLogEntry | null {
    if (!this.state) {
      return null;
    }

    try {
      return this.generateLogEntry();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'getCurrentLog');
      return null;
    }
  }

  public exportLog(format: 'json' | 'json-pretty' | 'json-compressed' = 'json-pretty'): AssessmentLogExport | null {
    const logEntry = this.getCurrentLog();
    if (!logEntry) {
      return null;
    }

    try {
      let data: string;
      
      switch (format) {
        case 'json':
          data = JSON.stringify(logEntry);
          break;
        case 'json-pretty':
          data = JSON.stringify(logEntry, null, 2);
          break;
        case 'json-compressed':
          data = JSON.stringify(logEntry);
          // TODO: Add actual compression if needed
          break;
        default:
          data = JSON.stringify(logEntry, null, 2);
      }

      const filename = this.generateLogFilename();
      const size = new Blob([data]).size;

      return {
        filename,
        format,
        data,
        size,
        generatedAt: Date.now(),
        sessionSummary: {
          totalEvents: logEntry.events.length,
          duration: logEntry.duration,
          flagged: logEntry.flagged,
          score: logEntry.totalScore
        }
      };

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'exportLog');
      return null;
    }
  }

  public getSessionState(): SessionState | null {
    return this.state;
  }

  public isSessionActive(): boolean {
    return this.state?.isActive || false;
  }

  private generateLogEntry(): AssessmentLogEntry {
    if (!this.state) {
      throw new Error('No active session');
    }

    const now = Date.now();
    const duration = now - this.state.startTime;
    const events = this.state.events.map(event => this.convertToLogEvent(event));
    const flags = this.state.flags.map(flag => this.convertToLogFlag(flag));
    
    // Calculate statistics
    const multipleFaceEvents = events.filter(e => e.type.includes('multiple_faces')).length;
    const lookingAwayEvents = events.filter(e => e.type.includes('looking_away')).length;
    const systemEvents = events.filter(e => e.type.includes('system') || e.type.includes('session')).length;
    
    const totalConfidence = events.reduce((sum, e) => sum + e.confidence, 0);
    const averageConfidence = events.length > 0 ? totalConfidence / events.length : 0;
    
    // Determine highest flag priority
    const activeFlagPriority = flags.length > 0 
      ? flags.sort((a, b) => b.priority - a.priority)[0]?.level 
      : null;

    const isFlagged = flags.some(f => !f.resolved);

    // Calculate session quality
    const sessionQuality = this.calculateSessionQuality(averageConfidence, this.state.continuousMonitoring, this.state.interruptions);

    const logEntry: AssessmentLogEntry = {
      assessmentId: this.state.session.assessmentId,
      studentId: this.state.session.studentId,
      sessionId: this.state.session.sessionId,
      timestamp: this.state.session.startTimestamp,
      duration,
      flagged: isFlagged,
      flagPriority: activeFlagPriority,
      totalScore: this.state.scoringStats?.currentScore || 0,
      events,
      summary: {
        totalEvents: events.length,
        multipleFaceEvents,
        lookingAwayEvents,
        systemEvents,
        averageConfidence,
        sessionQuality
      },
      flags,
      statistics: {
        scoreBreakdown: {
          multipleFaces: this.state.scoringStats?.eventContributions.multipleFaces.totalPoints || 0,
          lookingAway: this.state.scoringStats?.eventContributions.lookingAway.totalPoints || 0,
          other: this.state.scoringStats?.eventContributions.other.totalPoints || 0
        },
        detectionQuality: {
          averageConfidence,
          lowConfidenceEvents: events.filter(e => e.confidence < 0.6).length,
          totalDetections: events.filter(e => e.type.includes('detected')).length
        },
        sessionMetrics: {
          duration,
          continuousMonitoring: this.state.continuousMonitoring,
          interruptions: this.state.interruptions
        }
      },
      metadata: {
        version: '1.0.0',
        generatedAt: now,
        userAgent: this.state.session.userAgent,
        screenResolution: `${this.state.session.screenResolution.width}x${this.state.session.screenResolution.height}`,
        cameraResolution: this.state.session.cameraResolution 
          ? `${this.state.session.cameraResolution.width}x${this.state.session.cameraResolution.height}`
          : undefined
      }
    };

    return logEntry;
  }

  private convertToLogEvent(event: MonitoringEvent): AssessmentEventEntry {
    const baseEvent: AssessmentEventEntry = {
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      confidence: event.confidence,
      duration: event.duration,
      details: {}
    };

    // Add type-specific details
    switch (event.type) {
      case 'multiple_faces_detected':
        baseEvent.details.faceCount = event.faceCount;
        baseEvent.details.previousFaceCount = event.previousCount;
        baseEvent.details.sustainedDuration = event.sustainedDuration;
        break;
        
      case 'looking_away_extended':
        baseEvent.details.lookAwayDuration = event.lookAwayDuration;
        baseEvent.details.severity = event.severity;
        if (event.direction) {
          const direction = `${event.direction.x > 0 ? 'right' : event.direction.x < 0 ? 'left' : ''}${event.direction.y > 0 ? 'down' : event.direction.y < 0 ? 'up' : ''}`.trim();
          baseEvent.details.direction = direction || 'center';
        }
        break;
        
      case 'gaze_direction_change':
        if (event.gazeData) {
          baseEvent.details.gazePoint = event.gazeData.direction;
          baseEvent.details.deviation = event.gazeData.deviation;
        }
        break;
        
      case 'system_error':
      case 'ai_processing_error':
        if (event.systemData) {
          baseEvent.details.errorCode = event.systemData.errorCode;
          baseEvent.details.systemCategory = event.systemData.eventCategory;
        }
        break;
    }

    // Add metadata if present
    if (event.metadata) {
      baseEvent.details.metadata = event.metadata;
    }

    return baseEvent;
  }

  private convertToLogFlag(flag: Flag): AssessmentFlagEntry {
    return {
      id: flag.id,
      timestamp: flag.timestamp,
      level: flag.level,
      reason: flag.reason,
      score: flag.score,
      triggeringEventIds: flag.triggeringEvents,
      priority: flag.priority,
      category: flag.category,
      resolved: !flag.isActive,
      resolvedAt: !flag.isActive ? Date.now() : undefined
    };
  }

  private calculateSessionQuality(averageConfidence: number, continuousMonitoring: boolean, interruptions: number): 'excellent' | 'good' | 'fair' | 'poor' {
    let qualityScore = 0;
    
    // Confidence score (0-40 points)
    if (averageConfidence >= 0.9) qualityScore += 40;
    else if (averageConfidence >= 0.8) qualityScore += 30;
    else if (averageConfidence >= 0.7) qualityScore += 20;
    else if (averageConfidence >= 0.6) qualityScore += 10;
    
    // Continuous monitoring (0-30 points)
    if (continuousMonitoring) qualityScore += 30;
    else qualityScore += Math.max(0, 30 - interruptions * 10);
    
    // Duration and stability (0-30 points)
    const duration = this.state ? Date.now() - this.state.startTime : 0;
    if (duration > 300000) qualityScore += 30; // > 5 minutes
    else if (duration > 60000) qualityScore += 20; // > 1 minute
    else if (duration > 30000) qualityScore += 10; // > 30 seconds
    
    if (qualityScore >= 85) return 'excellent';
    if (qualityScore >= 70) return 'good';
    if (qualityScore >= 50) return 'fair';
    return 'poor';
  }

  private validateLogEntry(logEntry: AssessmentLogEntry): LogValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!logEntry.assessmentId) errors.push('Missing assessmentId');
      if (!logEntry.studentId) errors.push('Missing studentId');
      if (!logEntry.sessionId) errors.push('Missing sessionId');
      if (!logEntry.timestamp) errors.push('Missing timestamp');
      
      // Data consistency validation
      if (logEntry.events.length !== logEntry.summary.totalEvents) {
        warnings.push('Event count mismatch between events array and summary');
      }
      
      // Event validation
      logEntry.events.forEach((event, index) => {
        if (!event.id) errors.push(`Event ${index} missing id`);
        if (!event.type) errors.push(`Event ${index} missing type`);
        if (event.confidence < 0 || event.confidence > 1) {
          warnings.push(`Event ${index} has invalid confidence: ${event.confidence}`);
        }
      });
      
      // Flag validation
      logEntry.flags.forEach((flag, index) => {
        if (!flag.id) errors.push(`Flag ${index} missing id`);
        if (!flag.reason) errors.push(`Flag ${index} missing reason`);
        if (flag.priority < 1 || flag.priority > 10) {
          warnings.push(`Flag ${index} has unusual priority: ${flag.priority}`);
        }
      });
      
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: Date.now()
    };
  }

  private isDuplicateEvent(event: MonitoringEvent): boolean {
    if (!this.state || this.state.events.length === 0) {
      return false;
    }

    const recentEvents = this.state.events.slice(-10); // Check last 10 events
    return recentEvents.some(existingEvent => 
      existingEvent.type === event.type &&
      existingEvent.timestamp === event.timestamp &&
      existingEvent.confidence === event.confidence
    );
  }

  private startRealTimeLogging(): void {
    if (this.realTimeLogTimer) {
      clearInterval(this.realTimeLogTimer);
    }

    this.realTimeLogTimer = window.setInterval(() => {
      if (this.state && this.state.isActive && this.onLogGeneratedCallback) {
        try {
          const currentLog = this.generateLogEntry();
          this.onLogGeneratedCallback(currentLog);
        } catch (error) {
          console.warn('Real-time logging error:', error);
        }
      }
    }, 10000); // Generate log every 10 seconds
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAssessmentId(): string {
    return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateStudentId(): string {
    return `student_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateLogFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sessionId = this.state?.session.sessionId || 'unknown';
    return `assessment_log_${sessionId}_${timestamp}.json`;
  }

  private handleError(error: Error, context?: string): void {
    console.error(`AssessmentLogger error${context ? ` (${context})` : ''}:`, error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error, context);
    }
  }

  public destroy(): void {
    if (this.realTimeLogTimer) {
      clearInterval(this.realTimeLogTimer);
      this.realTimeLogTimer = undefined;
    }
    
    this.state = null;
  }
}
