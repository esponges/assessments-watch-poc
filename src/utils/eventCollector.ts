import type {
  MonitoringEvent,
  EventFilter,
  EventQuery,
  EventSummary,
  EventStatistics,
  EventValidationResult,
  EventExportOptions,
  EventExportResult,
  BaseEvent
} from '../types/events';

export interface EventCollectorOptions {
  maxEvents?: number; // Maximum events to store in memory
  autoCleanup?: boolean; // Auto-cleanup old events
  cleanupInterval?: number; // Cleanup interval in milliseconds
  maxAge?: number; // Maximum age of events in milliseconds
  enableValidation?: boolean; // Validate events before storing
  onEventAdded?: (event: MonitoringEvent) => void;
  onEventLimitReached?: (collector: EventCollector) => void;
  onError?: (error: Error, context?: string) => void;
}

export class EventCollector {
  private events: MonitoringEvent[] = [];
  private eventIndex: Map<string, number> = new Map(); // For fast lookups
  private sessionStartTime: number = Date.now();
  private sessionId: string;
  private options: Required<EventCollectorOptions>;
  private cleanupIntervalId?: NodeJS.Timeout;
  private eventCounter: number = 0;

  constructor(sessionId: string, options: EventCollectorOptions = {}) {
    this.sessionId = sessionId;
    this.options = {
      maxEvents: 10000,
      autoCleanup: true,
      cleanupInterval: 300000, // 5 minutes
      maxAge: 3600000, // 1 hour
      enableValidation: true,
      onEventAdded: () => {},
      onEventLimitReached: () => {
        console.warn('Event collector has reached maximum capacity');
      },
      onError: (error: Error, context?: string) => {
        console.error(`EventCollector error${context ? ` (${context})` : ''}:`, error);
      },
      ...options
    };

    // Start auto-cleanup if enabled
    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }

    console.log('EventCollector initialized:', {
      sessionId: this.sessionId,
      maxEvents: this.options.maxEvents,
      autoCleanup: this.options.autoCleanup
    });
  }

  /**
   * Add an event to the collection with validation and deduplication
   */
  addEvent(event: Omit<MonitoringEvent, 'id' | 'timestamp'>): string {
    try {
      // Generate ID and timestamp if not provided
      const completeEvent: MonitoringEvent = {
        id: `event_${this.sessionId}_${this.eventCounter++}_${Date.now()}`,
        timestamp: Date.now(),
        ...event
      } as MonitoringEvent;

      // Validate event if enabled
      if (this.options.enableValidation) {
        const validation = this.validateEvent(completeEvent);
        if (!validation.isValid) {
          throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Check for duplicates (same type and timestamp within 100ms)
      const isDuplicate = this.events.some(existingEvent => 
        existingEvent.type === completeEvent.type &&
        Math.abs(existingEvent.timestamp - completeEvent.timestamp) < 100
      );

      if (isDuplicate) {
        console.warn('Duplicate event detected, skipping:', completeEvent.type);
        return completeEvent.id;
      }

      // Check if we've reached the limit
      if (this.events.length >= this.options.maxEvents) {
        this.options.onEventLimitReached(this);
        // Remove oldest events to make room
        this.cleanup(Math.floor(this.options.maxEvents * 0.2)); // Remove 20% oldest
      }

      // Add event to collection
      this.events.push(completeEvent);
      this.eventIndex.set(completeEvent.id, this.events.length - 1);

      // Sort by timestamp to maintain chronological order
      this.events.sort((a, b) => a.timestamp - b.timestamp);
      this.rebuildIndex();

      // Trigger callback
      this.options.onEventAdded(completeEvent);

      console.debug('Event added:', completeEvent.type, completeEvent.id);
      return completeEvent.id;

    } catch (error) {
      this.options.onError(error as Error, 'addEvent');
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  getEvent(id: string): MonitoringEvent | null {
    const index = this.eventIndex.get(id);
    return index !== undefined ? this.events[index] : null;
  }

  /**
   * Query events with filtering and pagination
   */
  queryEvents(query: EventQuery = {}): MonitoringEvent[] {
    let filteredEvents = this.events;

    // Apply filters
    if (query.filter) {
      filteredEvents = this.applyFilter(filteredEvents, query.filter);
    }

    // Sort results
    if (query.sortBy) {
      filteredEvents = this.sortEvents(filteredEvents, query.sortBy, query.sortOrder || 'desc');
    }

    // Apply pagination
    const start = query.offset || 0;
    const end = query.limit ? start + query.limit : undefined;
    
    return filteredEvents.slice(start, end);
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType<T extends MonitoringEvent>(eventType: T['type']): T[] {
    return this.events.filter(event => event.type === eventType) as T[];
  }

  /**
   * Get events within a time range
   */
  getEventsInTimeRange(startTime: number, endTime: number): MonitoringEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Get the most recent N events
   */
  getRecentEvents(count: number): MonitoringEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Generate event statistics and summary
   */
  getStatistics(): EventStatistics {
    const summary = this.generateSummary();
    
    return {
      summary,
      patterns: {
        multipleFaceIncidents: this.analyzeMultipleFacePatterns(),
        lookingAwayPeriods: this.analyzeLookingAwayPatterns(),
        systemIssues: this.analyzeSystemIssues()
      }
    };
  }

  /**
   * Export events in various formats
   */
  exportEvents(options: EventExportOptions): EventExportResult {
    let eventsToExport = this.events;

    // Apply filters
    if (options.timeRange) {
      eventsToExport = this.getEventsInTimeRange(
        options.timeRange.start,
        options.timeRange.end
      );
    }

    if (options.eventTypes) {
      eventsToExport = eventsToExport.filter(event =>
        options.eventTypes!.includes(event.type)
      );
    }

    // Generate export data
    let exportData: string | object;
    let filename: string;

    switch (options.format) {
      case 'json':
        exportData = options.includeMetadata 
          ? {
              sessionId: this.sessionId,
              exportTimestamp: Date.now(),
              sessionStartTime: this.sessionStartTime,
              totalEvents: eventsToExport.length,
              events: eventsToExport
            }
          : eventsToExport;
        filename = `events_${this.sessionId}_${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'csv':
        exportData = this.convertToCSV(eventsToExport);
        filename = `events_${this.sessionId}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'xml':
        exportData = this.convertToXML(eventsToExport);
        filename = `events_${this.sessionId}_${new Date().toISOString().split('T')[0]}.xml`;
        break;

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      format: options.format,
      data: exportData,
      filename,
      size: typeof exportData === 'string' ? exportData.length : JSON.stringify(exportData).length,
      eventCount: eventsToExport.length
    };
  }

  /**
   * Clear all events from the collection
   */
  clear(): void {
    this.events = [];
    this.eventIndex.clear();
    this.eventCounter = 0;
    console.log('EventCollector cleared');
  }

  /**
   * Get current collection statistics
   */
  getCollectionInfo(): {
    eventCount: number;
    sessionId: string;
    sessionDuration: number;
    memoryUsage: number;
    oldestEventTime: number | null;
    newestEventTime: number | null;
  } {
    return {
      eventCount: this.events.length,
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEventTime: this.events.length > 0 ? this.events[0].timestamp : null,
      newestEventTime: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null
    };
  }

  /**
   * Manually trigger cleanup of old events
   */
  cleanup(maxToRemove?: number): number {
    const now = Date.now();
    const initialCount = this.events.length;
    
    let removedCount = 0;
    let i = 0;
    
    while (i < this.events.length && (!maxToRemove || removedCount < maxToRemove)) {
      const event = this.events[i];
      
      // Remove if event is too old
      if (now - event.timestamp > this.options.maxAge) {
        this.events.splice(i, 1);
        this.eventIndex.delete(event.id);
        removedCount++;
      } else {
        i++;
      }
    }

    // If we still need to remove more and maxToRemove is specified
    if (maxToRemove && removedCount < maxToRemove) {
      const additionalToRemove = Math.min(
        maxToRemove - removedCount,
        this.events.length
      );
      
      for (let j = 0; j < additionalToRemove; j++) {
        const removedEvent = this.events.shift();
        if (removedEvent) {
          this.eventIndex.delete(removedEvent.id);
          removedCount++;
        }
      }
    }

    if (removedCount > 0) {
      this.rebuildIndex();
      console.log(`Cleaned up ${removedCount} events from EventCollector`);
    }

    return removedCount;
  }

  /**
   * Dispose of the collector and cleanup resources
   */
  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.clear();
    console.log('EventCollector disposed');
  }

  // Private helper methods

  private startAutoCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private rebuildIndex(): void {
    this.eventIndex.clear();
    this.events.forEach((event, index) => {
      this.eventIndex.set(event.id, index);
    });
  }

  private validateEvent(event: MonitoringEvent): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!event.id || event.id.trim() === '') {
      errors.push('Event ID is required');
    }

    if (!event.type || event.type.trim() === '') {
      errors.push('Event type is required');
    }

    if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
      errors.push('Valid timestamp is required');
    }

    if (typeof event.confidence !== 'number' || event.confidence < 0 || event.confidence > 1) {
      errors.push('Confidence must be a number between 0 and 1');
    }

    // Warning for very old events
    if (Date.now() - event.timestamp > 300000) { // 5 minutes
      warnings.push('Event timestamp is more than 5 minutes old');
    }

    // Warning for very low confidence
    if (event.confidence < 0.3) {
      warnings.push('Event has very low confidence');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private applyFilter(events: MonitoringEvent[], filter: EventFilter): MonitoringEvent[] {
    return events.filter(event => {
      // Filter by event types
      if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
        return false;
      }

      // Filter by time range
      if (filter.timeRange) {
        if (event.timestamp < filter.timeRange.start || event.timestamp > filter.timeRange.end) {
          return false;
        }
      }

      // Filter by confidence threshold
      if (filter.confidenceThreshold && event.confidence < filter.confidenceThreshold) {
        return false;
      }

      // Filter by metadata
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (!event.metadata || event.metadata[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private sortEvents(
    events: MonitoringEvent[], 
    sortBy: 'timestamp' | 'confidence' | 'type',
    order: 'asc' | 'desc'
  ): MonitoringEvent[] {
    return events.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
  }

  private generateSummary(): EventSummary {
    const eventsByType: Record<string, number> = {};
    let totalConfidence = 0;
    let flaggedEvents = 0;
    
    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      totalConfidence += event.confidence;
      
      // Count flagged events (events with high suspicion)
      if (event.type.includes('multiple_faces') || event.type.includes('looking_away')) {
        flaggedEvents++;
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType: eventsByType as Record<MonitoringEvent['type'], number>,
      timeRange: {
        start: this.events.length > 0 ? this.events[0].timestamp : Date.now(),
        end: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : Date.now()
      },
      averageConfidence: this.events.length > 0 ? totalConfidence / this.events.length : 0,
      flaggedEventsCount: flaggedEvents,
      suspiciousActivityScore: this.calculateSuspiciousActivityScore()
    };
  }

  private analyzeMultipleFacePatterns(): Array<{
    startTime: number;
    endTime: number;
    maxFaceCount: number;
    duration: number;
  }> {
    const patterns: Array<{
      startTime: number;
      endTime: number;
      maxFaceCount: number;
      duration: number;
    }> = [];

    let currentIncident: {
      startTime: number;
      maxFaceCount: number;
    } | null = null;

    this.events.forEach(event => {
      if (event.type === 'multiple_faces_detected' && !currentIncident) {
        const multipleFaceEvent = event as any;
        currentIncident = {
          startTime: event.timestamp,
          maxFaceCount: multipleFaceEvent.faceCount || 2
        };
      } else if (event.type === 'face_count_change' && currentIncident) {
        const faceEvent = event as any;
        if (faceEvent.currentCount > 1) {
          currentIncident.maxFaceCount = Math.max(
            currentIncident.maxFaceCount,
            faceEvent.currentCount
          );
        }
      } else if (event.type === 'single_face_restored' && currentIncident) {
        patterns.push({
          startTime: currentIncident.startTime,
          endTime: event.timestamp,
          maxFaceCount: currentIncident.maxFaceCount,
          duration: event.timestamp - currentIncident.startTime
        });
        currentIncident = null;
      }
    });

    return patterns;
  }

  private analyzeLookingAwayPatterns(): Array<{
    startTime: number;
    endTime: number;
    duration: number;
    severity: string;
  }> {
    // Placeholder - will be implemented when gaze tracking is added
    return [];
  }

  private analyzeSystemIssues(): Array<{
    timestamp: number;
    type: string;
    severity: string;
  }> {
    return this.events
      .filter(event => event.type.includes('error') || event.type.includes('system'))
      .map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        severity: this.determineSeverity(event)
      }));
  }

  private calculateSuspiciousActivityScore(): number {
    let score = 0;
    
    this.events.forEach(event => {
      switch (event.type) {
        case 'multiple_faces_detected':
          score += 10;
          break;
        case 'looking_away_extended':
          score += 3;
          break;
        case 'no_faces_detected':
          if (event.duration && event.duration > 10000) { // > 10 seconds
            score += 5;
          }
          break;
      }
    });

    return score;
  }

  private determineSeverity(event: MonitoringEvent): string {
    if (event.type.includes('error') || event.confidence < 0.3) {
      return 'high';
    } else if (event.type.includes('warning') || event.confidence < 0.6) {
      return 'medium';
    }
    return 'low';
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    const eventSize = 500; // Approximate size per event in bytes
    return this.events.length * eventSize;
  }

  private convertToCSV(events: MonitoringEvent[]): string {
    const headers = [
      'id',
      'timestamp',
      'type',
      'confidence',
      'duration',
      'metadata'
    ];

    const rows = events.map(event => [
      event.id,
      new Date(event.timestamp).toISOString(),
      event.type,
      event.confidence.toString(),
      (event.duration || '').toString(),
      JSON.stringify(event.metadata || {})
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToXML(events: MonitoringEvent[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<events>\n';
    
    events.forEach(event => {
      xml += `  <event>\n`;
      xml += `    <id>${event.id}</id>\n`;
      xml += `    <timestamp>${event.timestamp}</timestamp>\n`;
      xml += `    <type>${event.type}</type>\n`;
      xml += `    <confidence>${event.confidence}</confidence>\n`;
      if (event.duration) {
        xml += `    <duration>${event.duration}</duration>\n`;
      }
      if (event.metadata) {
        xml += `    <metadata>${JSON.stringify(event.metadata)}</metadata>\n`;
      }
      xml += `  </event>\n`;
    });
    
    xml += '</events>';
    return xml;
  }
}