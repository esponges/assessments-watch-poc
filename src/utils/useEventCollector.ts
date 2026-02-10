import { useRef, useCallback, useEffect, useState } from 'react';
import { EventCollector, type EventCollectorOptions } from './eventCollector';
import type { 
  MonitoringEvent, 
  EventQuery, 
  EventStatistics,
  EventExportOptions,
  EventExportResult
} from '../types/events';

interface UseEventCollectorOptions extends EventCollectorOptions {
  sessionId?: string;
  autoStart?: boolean;
}

interface UseEventCollectorReturn {
  addEvent: (event: Omit<MonitoringEvent, 'id' | 'timestamp'>) => string;
  getEvent: (id: string) => MonitoringEvent | null;
  queryEvents: (query?: EventQuery) => MonitoringEvent[];
  getEventsByType: <T extends MonitoringEvent>(eventType: T['type']) => T[];
  getRecentEvents: (count: number) => MonitoringEvent[];
  getStatistics: () => EventStatistics;
  exportEvents: (options: EventExportOptions) => EventExportResult;
  clear: () => void;
  dispose: () => void;
  sessionId: string;
  eventCount: number;
  statistics: EventStatistics | null;
  recentEvents: MonitoringEvent[];
  isActive: boolean;
}

export const useEventCollector = (
  options: UseEventCollectorOptions = {}
): UseEventCollectorReturn => {
  const [eventCount, setEventCount] = useState(0);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [recentEvents, setRecentEvents] = useState<MonitoringEvent[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [sessionId] = useState(() => 
    options.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  );
  
  const collectorRef = useRef<EventCollector | null>(null);
  const statsUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize event collector
  const initialize = useCallback(() => {
    if (collectorRef.current) {
      return; // Already initialized
    }

    const collectorOptions: EventCollectorOptions = {
      maxEvents: 5000,
      autoCleanup: true,
      cleanupInterval: 300000, // 5 minutes
      maxAge: 3600000, // 1 hour
      enableValidation: true,
      onEventAdded: (event: MonitoringEvent) => {
        setEventCount(prev => prev + 1);
        setRecentEvents(prev => [...prev.slice(-19), event]); // Keep last 20 events
      },
      onEventLimitReached: () => {
        console.warn('Event collector limit reached, cleaning up old events');
      },
      onError: (error: Error, context?: string) => {
        console.error(`EventCollector error${context ? ` (${context})` : ''}:`, error);
      },
      ...options
    };

    collectorRef.current = new EventCollector(sessionId, collectorOptions);
    setIsActive(true);

    // Start periodic statistics updates
    statsUpdateIntervalRef.current = setInterval(() => {
      if (collectorRef.current) {
        const stats = collectorRef.current.getStatistics();
        setStatistics(stats);
      }
    }, 5000); // Update every 5 seconds

    console.log('EventCollector hook initialized:', sessionId);
  }, [sessionId, options]);

  // Add event
  const addEvent = useCallback((event: Omit<MonitoringEvent, 'id' | 'timestamp'>): string => {
    if (!collectorRef.current) {
      throw new Error('EventCollector not initialized. Call initialize() first.');
    }

    return collectorRef.current.addEvent(event);
  }, []);

  // Get specific event
  const getEvent = useCallback((id: string): MonitoringEvent | null => {
    if (!collectorRef.current) return null;
    return collectorRef.current.getEvent(id);
  }, []);

  // Query events
  const queryEvents = useCallback((query: EventQuery = {}): MonitoringEvent[] => {
    if (!collectorRef.current) return [];
    return collectorRef.current.queryEvents(query);
  }, []);

  // Get events by type
  const getEventsByType = useCallback(<T extends MonitoringEvent>(eventType: T['type']): T[] => {
    if (!collectorRef.current) return [];
    return collectorRef.current.getEventsByType<T>(eventType);
  }, []);

  // Get recent events
  const getRecentEvents = useCallback((count: number): MonitoringEvent[] => {
    if (!collectorRef.current) return [];
    return collectorRef.current.getRecentEvents(count);
  }, []);

  // Get statistics
  const getStatistics = useCallback((): EventStatistics => {
    if (!collectorRef.current) {
      return {
        summary: {
          totalEvents: 0,
          eventsByType: {} as Record<MonitoringEvent['type'], number>,
          timeRange: { start: Date.now(), end: Date.now() },
          averageConfidence: 0,
          flaggedEventsCount: 0,
          suspiciousActivityScore: 0
        },
        patterns: {
          multipleFaceIncidents: [],
          lookingAwayPeriods: [],
          systemIssues: []
        }
      };
    }
    return collectorRef.current.getStatistics();
  }, []);

  // Export events
  const exportEvents = useCallback((options: EventExportOptions): EventExportResult => {
    if (!collectorRef.current) {
      throw new Error('EventCollector not initialized');
    }
    return collectorRef.current.exportEvents(options);
  }, []);

  // Clear events
  const clear = useCallback(() => {
    if (collectorRef.current) {
      collectorRef.current.clear();
      setEventCount(0);
      setRecentEvents([]);
      setStatistics(null);
    }
  }, []);

  // Dispose collector
  const dispose = useCallback(() => {
    if (statsUpdateIntervalRef.current) {
      clearInterval(statsUpdateIntervalRef.current);
      statsUpdateIntervalRef.current = null;
    }

    if (collectorRef.current) {
      collectorRef.current.dispose();
      collectorRef.current = null;
    }

    setIsActive(false);
    setEventCount(0);
    setRecentEvents([]);
    setStatistics(null);
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (options.autoStart !== false) { // Default to true
      initialize();
    }

    return () => {
      dispose();
    };
  }, [options.autoStart, initialize, dispose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    addEvent,
    getEvent,
    queryEvents,
    getEventsByType,
    getRecentEvents,
    getStatistics,
    exportEvents,
    clear,
    dispose,
    sessionId,
    eventCount,
    statistics,
    recentEvents,
    isActive
  };
};