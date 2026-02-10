import type { FaceCountEvent, FaceCountStats } from '../types/faceCounter';

export interface FaceCountLog {
  sessionId: string;
  timestamp: number;
  events: FaceCountEvent[];
  stats: FaceCountStats;
  metadata: {
    userAgent: string;
    sessionDuration: number;
    detectionSettings: Record<string, unknown>;
  };
}

export interface FaceCountLoggerOptions {
  sessionId?: string;
  maxEvents?: number; // Maximum events to store in memory
  autoSave?: boolean; // Auto-save to localStorage
  onLogFull?: (log: FaceCountLog) => void; // Callback when log is full
}

class FaceCountLogger {
  private sessionId: string;
  private events: FaceCountEvent[] = [];
  private sessionStartTime: number = Date.now();
  private options: Required<FaceCountLoggerOptions>;

  constructor(options: FaceCountLoggerOptions = {}) {
    this.sessionId = options.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    this.options = {
      sessionId: this.sessionId,
      maxEvents: 1000, // Store up to 1000 events
      autoSave: true,
      onLogFull: () => {
        console.warn('Face count log is full. Consider processing and clearing events.');
      },
      ...options
    };

    console.log('Face count logger initialized:', this.sessionId);
  }

  logEvent(event: FaceCountEvent): void {
    // Add session metadata to event
    const enrichedEvent: FaceCountEvent = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    this.events.push(enrichedEvent);

    // Check if we've reached the maximum events
    if (this.events.length >= this.options.maxEvents) {
      this.options.onLogFull(this.createLog());
      
      // Keep only the most recent half of events
      const keepCount = Math.floor(this.options.maxEvents / 2);
      this.events = this.events.slice(-keepCount);
    }

    // Auto-save if enabled
    if (this.options.autoSave) {
      this.saveToLocalStorage();
    }

    // Log important events to console
    if (['multiple_faces_detected', 'single_face_restored'].includes(event.eventType)) {
      console.log('Important face count event:', enrichedEvent);
    }
  }

  createLog(stats?: FaceCountStats): FaceCountLog {
    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events: [...this.events], // Create copy
      stats: stats || {
        totalFrames: 0,
        averageFaceCount: 0,
        maxFaceCount: 0,
        multipleFaceDetections: 0,
        noFaceDetections: 0,
        singleFaceDetections: 0,
        currentStability: 0,
        sessionStartTime: this.sessionStartTime
      },
      metadata: {
        userAgent: navigator.userAgent,
        sessionDuration: Date.now() - this.sessionStartTime,
        detectionSettings: {
          timestamp: Date.now(),
          // This would be populated with actual detection settings
        }
      }
    };
  }

  getEvents(): FaceCountEvent[] {
    return [...this.events];
  }

  getEventsByType(eventType: FaceCountEvent['eventType']): FaceCountEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  getEventsInTimeRange(startTime: number, endTime: number): FaceCountEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  getSessionSummary(): {
    sessionId: string;
    duration: number;
    eventCounts: Record<FaceCountEvent['eventType'], number>;
    totalEvents: number;
    multipleFaceIncidents: Array<{
      startTime: number;
      duration: number;
      maxFaceCount: number;
    }>;
  } {
    const eventCounts: Record<FaceCountEvent['eventType'], number> = {
      'count_change': 0,
      'multiple_faces_detected': 0,
      'single_face_restored': 0,
      'no_faces_detected': 0
    };

    this.events.forEach(event => {
      eventCounts[event.eventType]++;
    });

    // Analyze multiple face incidents
    const multipleFaceIncidents: Array<{
      startTime: number;
      duration: number;
      maxFaceCount: number;
    }> = [];

    let currentIncident: { startTime: number; maxFaceCount: number } | null = null;

    this.events.forEach(event => {
      if (event.eventType === 'multiple_faces_detected' && !currentIncident) {
        currentIncident = {
          startTime: event.timestamp,
          maxFaceCount: event.currentCount
        };
      } else if (event.eventType === 'count_change' && currentIncident && event.currentCount > 1) {
        currentIncident.maxFaceCount = Math.max(currentIncident.maxFaceCount, event.currentCount);
      } else if (event.eventType === 'single_face_restored' && currentIncident) {
        multipleFaceIncidents.push({
          startTime: currentIncident.startTime,
          duration: event.timestamp - currentIncident.startTime,
          maxFaceCount: currentIncident.maxFaceCount
        });
        currentIncident = null;
      }
    });

    // Handle ongoing incident
    if (currentIncident) {
      multipleFaceIncidents.push({
        startTime: currentIncident.startTime,
        duration: Date.now() - currentIncident.startTime,
        maxFaceCount: currentIncident.maxFaceCount
      });
    }

    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStartTime,
      eventCounts,
      totalEvents: this.events.length,
      multipleFaceIncidents
    };
  }

  exportToJSON(): string {
    const log = this.createLog();
    return JSON.stringify(log, null, 2);
  }

  exportToCSV(): string {
    const headers = [
      'timestamp',
      'eventType',
      'previousCount',
      'currentCount',
      'confidence',
      'duration',
      'sessionId'
    ];

    const rows = this.events.map(event => [
      new Date(event.timestamp).toISOString(),
      event.eventType,
      event.previousCount.toString(),
      event.currentCount.toString(),
      event.confidence.toFixed(3),
      (event.duration || '').toString(),
      this.sessionId
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  saveToLocalStorage(): void {
    try {
      const key = `faceCountLog_${this.sessionId}`;
      const log = this.createLog();
      localStorage.setItem(key, JSON.stringify(log));
    } catch (error) {
      console.error('Failed to save face count log to localStorage:', error);
    }
  }

  static loadFromLocalStorage(sessionId: string): FaceCountLog | null {
    try {
      const key = `faceCountLog_${sessionId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load face count log from localStorage:', error);
    }
    return null;
  }

  static getAllSessionIds(): string[] {
    const sessionIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('faceCountLog_')) {
        const sessionId = key.replace('faceCountLog_', '');
        sessionIds.push(sessionId);
      }
    }
    return sessionIds;
  }

  static clearOldSessions(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const sessionIds = FaceCountLogger.getAllSessionIds();
    
    sessionIds.forEach(sessionId => {
      const log = FaceCountLogger.loadFromLocalStorage(sessionId);
      if (log && (now - log.timestamp) > maxAge) {
        localStorage.removeItem(`faceCountLog_${sessionId}`);
        console.log('Cleaned up old face count log:', sessionId);
      }
    });
  }

  clear(): void {
    this.events = [];
    console.log('Face count logger cleared');
  }

  reset(): void {
    this.events = [];
    this.sessionStartTime = Date.now();
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log('Face count logger reset with new session:', this.sessionId);
  }
}

export { FaceCountLogger };
export default FaceCountLogger;