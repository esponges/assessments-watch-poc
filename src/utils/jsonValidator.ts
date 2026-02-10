import type {
  AssessmentLogEntry,
  AssessmentEventEntry,
  AssessmentFlagEntry,
  AssessmentSession,
  LogValidationResult
} from '../types/assessmentLogging';

export class JsonValidator {
  
  public static validateEvent(event: AssessmentEventEntry): LogValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields
      if (!event.id || typeof event.id !== 'string') {
        errors.push('Event must have a valid string id');
      }
      
      if (!event.timestamp || typeof event.timestamp !== 'number') {
        errors.push('Event must have a valid numeric timestamp');
      }
      
      if (!event.type || typeof event.type !== 'string') {
        errors.push('Event must have a valid string type');
      }
      
      // Confidence validation
      if (typeof event.confidence !== 'number') {
        errors.push('Event confidence must be a number');
      } else {
        if (event.confidence < 0 || event.confidence > 1) {
          warnings.push('Event confidence should be between 0 and 1');
        }
      }
      
      // Duration validation
      if (event.duration !== undefined) {
        if (typeof event.duration !== 'number' || event.duration < 0) {
          warnings.push('Event duration should be a positive number');
        }
      }
      
      // Type-specific validation
      this.validateEventTypeSpecific(event, errors, warnings);
      
      // Details validation
      if (event.details && typeof event.details !== 'object') {
        errors.push('Event details must be an object');
      }
      
      // Score validation
      if (event.score) {
        if (typeof event.score.pointsAwarded !== 'number') {
          errors.push('Event score pointsAwarded must be a number');
        }
        if (!event.score.reason || typeof event.score.reason !== 'string') {
          errors.push('Event score reason must be a string');
        }
        if (typeof event.score.totalScore !== 'number') {
          errors.push('Event score totalScore must be a number');
        }
      }
      
    } catch (error) {
      errors.push(`Event validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: Date.now()
    };
  }

  public static validateFlag(flag: AssessmentFlagEntry): LogValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields
      if (!flag.id || typeof flag.id !== 'string') {
        errors.push('Flag must have a valid string id');
      }
      
      if (!flag.timestamp || typeof flag.timestamp !== 'number') {
        errors.push('Flag must have a valid numeric timestamp');
      }
      
      if (!flag.level || !['low', 'medium', 'high', 'critical'].includes(flag.level)) {
        errors.push('Flag must have a valid level (low, medium, high, critical)');
      }
      
      if (!flag.reason || typeof flag.reason !== 'string') {
        errors.push('Flag must have a valid string reason');
      }
      
      // Score validation
      if (typeof flag.score !== 'number' || flag.score < 0) {
        warnings.push('Flag score should be a non-negative number');
      }
      
      // Priority validation
      if (typeof flag.priority !== 'number' || flag.priority < 1 || flag.priority > 10) {
        warnings.push('Flag priority should be between 1 and 10');
      }
      
      // Category validation
      if (!flag.category || typeof flag.category !== 'string') {
        warnings.push('Flag should have a category');
      }
      
      // Triggering events validation
      if (!Array.isArray(flag.triggeringEventIds)) {
        errors.push('Flag triggeringEventIds must be an array');
      } else {
        flag.triggeringEventIds.forEach((id, index) => {
          if (typeof id !== 'string') {
            errors.push(`Flag triggeringEventIds[${index}] must be a string`);
          }
        });
      }
      
      // Resolution validation
      if (typeof flag.resolved !== 'boolean') {
        errors.push('Flag resolved must be a boolean');
      }
      
      if (flag.resolved && flag.resolvedAt) {
        if (typeof flag.resolvedAt !== 'number') {
          warnings.push('Flag resolvedAt should be a number when provided');
        } else if (flag.resolvedAt < flag.timestamp) {
          warnings.push('Flag resolvedAt should be after flag timestamp');
        }
      }
      
    } catch (error) {
      errors.push(`Flag validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: Date.now()
    };
  }

  public static validateSession(session: AssessmentSession): LogValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields
      if (!session.assessmentId || typeof session.assessmentId !== 'string') {
        errors.push('Session must have a valid string assessmentId');
      }
      
      if (!session.studentId || typeof session.studentId !== 'string') {
        errors.push('Session must have a valid string studentId');
      }
      
      if (!session.sessionId || typeof session.sessionId !== 'string') {
        errors.push('Session must have a valid string sessionId');
      }
      
      if (!session.startTimestamp || typeof session.startTimestamp !== 'number') {
        errors.push('Session must have a valid numeric startTimestamp');
      }
      
      // End timestamp validation
      if (session.endTimestamp) {
        if (typeof session.endTimestamp !== 'number') {
          errors.push('Session endTimestamp must be a number when provided');
        } else if (session.endTimestamp < session.startTimestamp) {
          errors.push('Session endTimestamp must be after startTimestamp');
        }
      }
      
      // Duration validation
      if (session.duration !== undefined) {
        if (typeof session.duration !== 'number' || session.duration < 0) {
          warnings.push('Session duration should be a positive number');
        }
        
        if (session.endTimestamp && session.startTimestamp) {
          const calculatedDuration = session.endTimestamp - session.startTimestamp;
          if (Math.abs(session.duration - calculatedDuration) > 1000) { // 1 second tolerance
            warnings.push('Session duration does not match calculated duration');
          }
        }
      }
      
      // User agent validation
      if (!session.userAgent || typeof session.userAgent !== 'string') {
        warnings.push('Session should have a userAgent');
      }
      
      // Screen resolution validation
      if (!session.screenResolution) {
        warnings.push('Session should have screenResolution');
      } else {
        if (typeof session.screenResolution.width !== 'number' || session.screenResolution.width <= 0) {
          warnings.push('Session screenResolution width should be a positive number');
        }
        if (typeof session.screenResolution.height !== 'number' || session.screenResolution.height <= 0) {
          warnings.push('Session screenResolution height should be a positive number');
        }
      }
      
      // Camera resolution validation (optional)
      if (session.cameraResolution) {
        if (typeof session.cameraResolution.width !== 'number' || session.cameraResolution.width <= 0) {
          warnings.push('Session cameraResolution width should be a positive number');
        }
        if (typeof session.cameraResolution.height !== 'number' || session.cameraResolution.height <= 0) {
          warnings.push('Session cameraResolution height should be a positive number');
        }
      }
      
    } catch (error) {
      errors.push(`Session validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: Date.now()
    };
  }

  public static validateLogEntry(logEntry: AssessmentLogEntry): LogValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic required fields
      if (!logEntry.assessmentId || typeof logEntry.assessmentId !== 'string') {
        errors.push('Log entry must have a valid string assessmentId');
      }
      
      if (!logEntry.studentId || typeof logEntry.studentId !== 'string') {
        errors.push('Log entry must have a valid string studentId');
      }
      
      if (!logEntry.sessionId || typeof logEntry.sessionId !== 'string') {
        errors.push('Log entry must have a valid string sessionId');
      }
      
      if (!logEntry.timestamp || typeof logEntry.timestamp !== 'number') {
        errors.push('Log entry must have a valid numeric timestamp');
      }
      
      if (typeof logEntry.duration !== 'number' || logEntry.duration < 0) {
        errors.push('Log entry duration must be a non-negative number');
      }
      
      if (typeof logEntry.flagged !== 'boolean') {
        errors.push('Log entry flagged must be a boolean');
      }
      
      if (typeof logEntry.totalScore !== 'number') {
        errors.push('Log entry totalScore must be a number');
      }
      
      // Flag priority validation
      if (logEntry.flagPriority !== null && !['low', 'medium', 'high', 'critical'].includes(logEntry.flagPriority)) {
        errors.push('Log entry flagPriority must be null or a valid priority level');
      }
      
      // Events validation
      if (!Array.isArray(logEntry.events)) {
        errors.push('Log entry events must be an array');
      } else {
        logEntry.events.forEach((event, index) => {
          const eventValidation = this.validateEvent(event);
          eventValidation.errors.forEach(error => 
            errors.push(`Event ${index}: ${error}`)
          );
          eventValidation.warnings.forEach(warning => 
            warnings.push(`Event ${index}: ${warning}`)
          );
        });
      }
      
      // Flags validation
      if (!Array.isArray(logEntry.flags)) {
        errors.push('Log entry flags must be an array');
      } else {
        logEntry.flags.forEach((flag, index) => {
          const flagValidation = this.validateFlag(flag);
          flagValidation.errors.forEach(error => 
            errors.push(`Flag ${index}: ${error}`)
          );
          flagValidation.warnings.forEach(warning => 
            warnings.push(`Flag ${index}: ${warning}`)
          );
        });
      }
      
      // Summary validation
      this.validateSummary(logEntry, errors, warnings);
      
      // Statistics validation
      this.validateStatistics(logEntry, errors, warnings);
      
      // Metadata validation
      this.validateMetadata(logEntry, errors, warnings);
      
    } catch (error) {
      errors.push(`Log entry validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: Date.now()
    };
  }

  private static validateEventTypeSpecific(event: AssessmentEventEntry, errors: string[], warnings: string[]): void {
    switch (event.type) {
      case 'multiple_faces_detected':
        if (event.details.faceCount !== undefined && typeof event.details.faceCount !== 'number') {
          warnings.push('Multiple faces event should have numeric faceCount');
        }
        if (event.details.previousFaceCount !== undefined && typeof event.details.previousFaceCount !== 'number') {
          warnings.push('Multiple faces event should have numeric previousFaceCount');
        }
        break;
        
      case 'looking_away_extended':
        if (event.details.lookAwayDuration !== undefined && typeof event.details.lookAwayDuration !== 'number') {
          warnings.push('Looking away event should have numeric lookAwayDuration');
        }
        if (event.details.severity && !['minor', 'moderate', 'severe', 'critical'].includes(event.details.severity as string)) {
          warnings.push('Looking away event severity should be minor, moderate, severe, or critical');
        }
        break;
        
      case 'gaze_direction_change':
        if (event.details.gazePoint) {
          const point = event.details.gazePoint as any;
          if (typeof point.x !== 'number' || typeof point.y !== 'number') {
            warnings.push('Gaze event gazePoint should have numeric x and y coordinates');
          }
        }
        if (event.details.deviation !== undefined && typeof event.details.deviation !== 'number') {
          warnings.push('Gaze event should have numeric deviation');
        }
        break;
    }
  }

  private static validateSummary(logEntry: AssessmentLogEntry, errors: string[], warnings: string[]): void {
    const summary = logEntry.summary;
    
    if (!summary) {
      errors.push('Log entry must have a summary');
      return;
    }
    
    if (typeof summary.totalEvents !== 'number') {
      errors.push('Summary totalEvents must be a number');
    } else if (summary.totalEvents !== logEntry.events.length) {
      warnings.push('Summary totalEvents does not match events array length');
    }
    
    if (typeof summary.multipleFaceEvents !== 'number') {
      warnings.push('Summary multipleFaceEvents should be a number');
    }
    
    if (typeof summary.lookingAwayEvents !== 'number') {
      warnings.push('Summary lookingAwayEvents should be a number');
    }
    
    if (typeof summary.averageConfidence !== 'number') {
      warnings.push('Summary averageConfidence should be a number');
    } else if (summary.averageConfidence < 0 || summary.averageConfidence > 1) {
      warnings.push('Summary averageConfidence should be between 0 and 1');
    }
    
    if (!['excellent', 'good', 'fair', 'poor'].includes(summary.sessionQuality)) {
      warnings.push('Summary sessionQuality should be excellent, good, fair, or poor');
    }
  }

  private static validateStatistics(logEntry: AssessmentLogEntry, errors: string[], warnings: string[]): void {
    const stats = logEntry.statistics;
    
    if (!stats) {
      errors.push('Log entry must have statistics');
      return;
    }
    
    // Score breakdown validation
    if (!stats.scoreBreakdown) {
      warnings.push('Statistics should have scoreBreakdown');
    } else {
      ['multipleFaces', 'lookingAway', 'other'].forEach(key => {
        if (typeof (stats.scoreBreakdown as any)[key] !== 'number') {
          warnings.push(`Statistics scoreBreakdown.${key} should be a number`);
        }
      });
    }
    
    // Detection quality validation
    if (!stats.detectionQuality) {
      warnings.push('Statistics should have detectionQuality');
    } else {
      if (typeof stats.detectionQuality.averageConfidence !== 'number') {
        warnings.push('Statistics detectionQuality.averageConfidence should be a number');
      }
      if (typeof stats.detectionQuality.totalDetections !== 'number') {
        warnings.push('Statistics detectionQuality.totalDetections should be a number');
      }
    }
    
    // Session metrics validation
    if (!stats.sessionMetrics) {
      warnings.push('Statistics should have sessionMetrics');
    } else {
      if (typeof stats.sessionMetrics.duration !== 'number') {
        warnings.push('Statistics sessionMetrics.duration should be a number');
      }
      if (typeof stats.sessionMetrics.continuousMonitoring !== 'boolean') {
        warnings.push('Statistics sessionMetrics.continuousMonitoring should be a boolean');
      }
    }
  }

  private static validateMetadata(logEntry: AssessmentLogEntry, errors: string[], warnings: string[]): void {
    const metadata = logEntry.metadata;
    
    if (!metadata) {
      errors.push('Log entry must have metadata');
      return;
    }
    
    if (!metadata.version || typeof metadata.version !== 'string') {
      warnings.push('Metadata should have a version string');
    }
    
    if (!metadata.generatedAt || typeof metadata.generatedAt !== 'number') {
      warnings.push('Metadata should have a numeric generatedAt timestamp');
    }
    
    if (!metadata.userAgent || typeof metadata.userAgent !== 'string') {
      warnings.push('Metadata should have a userAgent string');
    }
    
    if (!metadata.screenResolution || typeof metadata.screenResolution !== 'string') {
      warnings.push('Metadata should have a screenResolution string');
    }
  }
}

export class DataSanitizer {
  
  public static sanitizeEvent(event: any): AssessmentEventEntry {
    return {
      id: String(event.id || ''),
      timestamp: Number(event.timestamp) || Date.now(),
      type: String(event.type || 'unknown'),
      confidence: Math.max(0, Math.min(1, Number(event.confidence) || 0)),
      duration: event.duration !== undefined ? Math.max(0, Number(event.duration)) : undefined,
      details: this.sanitizeObject(event.details || {}),
      score: event.score ? {
        pointsAwarded: Number(event.score.pointsAwarded) || 0,
        reason: String(event.score.reason || ''),
        totalScore: Number(event.score.totalScore) || 0
      } : undefined
    };
  }

  public static sanitizeFlag(flag: any): AssessmentFlagEntry {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    
    return {
      id: String(flag.id || ''),
      timestamp: Number(flag.timestamp) || Date.now(),
      level: validLevels.includes(flag.level) ? flag.level : 'medium',
      reason: String(flag.reason || ''),
      score: Math.max(0, Number(flag.score) || 0),
      triggeringEventIds: Array.isArray(flag.triggeringEventIds) 
        ? flag.triggeringEventIds.map(id => String(id))
        : [],
      priority: Math.max(1, Math.min(10, Number(flag.priority) || 5)),
      category: String(flag.category || 'general'),
      resolved: Boolean(flag.resolved),
      resolvedAt: flag.resolvedAt ? Number(flag.resolvedAt) : undefined
    };
  }

  public static sanitizeLogEntry(logEntry: any): AssessmentLogEntry {
    const sanitizedEvents = Array.isArray(logEntry.events) 
      ? logEntry.events.map(this.sanitizeEvent)
      : [];
      
    const sanitizedFlags = Array.isArray(logEntry.flags) 
      ? logEntry.flags.map(this.sanitizeFlag)
      : [];

    return {
      assessmentId: String(logEntry.assessmentId || ''),
      studentId: String(logEntry.studentId || ''),
      sessionId: String(logEntry.sessionId || ''),
      timestamp: Number(logEntry.timestamp) || Date.now(),
      duration: Math.max(0, Number(logEntry.duration) || 0),
      flagged: Boolean(logEntry.flagged),
      flagPriority: logEntry.flagPriority && ['low', 'medium', 'high', 'critical'].includes(logEntry.flagPriority) 
        ? logEntry.flagPriority 
        : null,
      totalScore: Math.max(0, Number(logEntry.totalScore) || 0),
      events: sanitizedEvents,
      summary: this.sanitizeSummary(logEntry.summary, sanitizedEvents),
      flags: sanitizedFlags,
      statistics: this.sanitizeStatistics(logEntry.statistics),
      metadata: this.sanitizeMetadata(logEntry.metadata)
    };
  }

  private static sanitizeObject(obj: any): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }
    
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private static sanitizeSummary(summary: any, events: AssessmentEventEntry[]): AssessmentLogEntry['summary'] {
    return {
      totalEvents: events.length,
      multipleFaceEvents: Number(summary?.multipleFaceEvents) || events.filter(e => e.type.includes('multiple_faces')).length,
      lookingAwayEvents: Number(summary?.lookingAwayEvents) || events.filter(e => e.type.includes('looking_away')).length,
      systemEvents: Number(summary?.systemEvents) || events.filter(e => e.type.includes('system')).length,
      averageConfidence: events.length > 0 
        ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length
        : 0,
      sessionQuality: ['excellent', 'good', 'fair', 'poor'].includes(summary?.sessionQuality) 
        ? summary.sessionQuality 
        : 'fair'
    };
  }

  private static sanitizeStatistics(statistics: any): AssessmentLogEntry['statistics'] {
    return {
      scoreBreakdown: {
        multipleFaces: Math.max(0, Number(statistics?.scoreBreakdown?.multipleFaces) || 0),
        lookingAway: Math.max(0, Number(statistics?.scoreBreakdown?.lookingAway) || 0),
        other: Math.max(0, Number(statistics?.scoreBreakdown?.other) || 0)
      },
      detectionQuality: {
        averageConfidence: Math.max(0, Math.min(1, Number(statistics?.detectionQuality?.averageConfidence) || 0)),
        lowConfidenceEvents: Math.max(0, Number(statistics?.detectionQuality?.lowConfidenceEvents) || 0),
        totalDetections: Math.max(0, Number(statistics?.detectionQuality?.totalDetections) || 0)
      },
      sessionMetrics: {
        duration: Math.max(0, Number(statistics?.sessionMetrics?.duration) || 0),
        continuousMonitoring: Boolean(statistics?.sessionMetrics?.continuousMonitoring),
        interruptions: Math.max(0, Number(statistics?.sessionMetrics?.interruptions) || 0)
      }
    };
  }

  private static sanitizeMetadata(metadata: any): AssessmentLogEntry['metadata'] {
    return {
      version: String(metadata?.version || '1.0.0'),
      generatedAt: Number(metadata?.generatedAt) || Date.now(),
      userAgent: String(metadata?.userAgent || navigator.userAgent || ''),
      screenResolution: String(metadata?.screenResolution || '0x0'),
      cameraResolution: metadata?.cameraResolution ? String(metadata.cameraResolution) : undefined
    };
  }
}