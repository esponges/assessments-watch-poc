import { useRef, useCallback, useEffect, useState } from 'react';
import FaceCountLogger, { type FaceCountLoggerOptions } from './faceCountLogger';
import type { FaceCountEvent, FaceCountStats } from '../types/faceCounter';

interface UseFaceCountLoggerReturn {
  logEvent: (event: FaceCountEvent) => void;
  getEvents: () => FaceCountEvent[];
  getSessionSummary: () => ReturnType<typeof FaceCountLogger.prototype.getSessionSummary>;
  exportToJSON: () => string;
  exportToCSV: () => string;
  clear: () => void;
  reset: () => void;
  sessionId: string;
  eventCount: number;
}

export const useFaceCountLogger = (
  options: FaceCountLoggerOptions = {}
): UseFaceCountLoggerReturn => {
  const loggerRef = useRef<FaceCountLogger | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [eventCount, setEventCount] = useState<number>(0);

  // Initialize logger
  useEffect(() => {
    loggerRef.current = new FaceCountLogger({
      autoSave: true,
      maxEvents: 1000,
      onLogFull: (log) => {
        console.log('Face count log is full, processed:', log.events.length, 'events');
      },
      ...options
    });

    setSessionId(loggerRef.current['sessionId']); // Access private property for display

    return () => {
      loggerRef.current = null;
    };
  }, []);

  // Log event
  const logEvent = useCallback((event: FaceCountEvent) => {
    if (loggerRef.current) {
      loggerRef.current.logEvent(event);
      setEventCount(prev => prev + 1);
    }
  }, []);

  // Get events
  const getEvents = useCallback(() => {
    return loggerRef.current?.getEvents() || [];
  }, []);

  // Get session summary
  const getSessionSummary = useCallback(() => {
    return loggerRef.current?.getSessionSummary() || {
      sessionId: '',
      duration: 0,
      eventCounts: {
        'count_change': 0,
        'multiple_faces_detected': 0,
        'single_face_restored': 0,
        'no_faces_detected': 0
      },
      totalEvents: 0,
      multipleFaceIncidents: []
    };
  }, []);

  // Export to JSON
  const exportToJSON = useCallback(() => {
    return loggerRef.current?.exportToJSON() || '{}';
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    return loggerRef.current?.exportToCSV() || '';
  }, []);

  // Clear events
  const clear = useCallback(() => {
    if (loggerRef.current) {
      loggerRef.current.clear();
      setEventCount(0);
    }
  }, []);

  // Reset logger
  const reset = useCallback(() => {
    if (loggerRef.current) {
      loggerRef.current.reset();
      setSessionId(loggerRef.current['sessionId']);
      setEventCount(0);
    }
  }, []);

  return {
    logEvent,
    getEvents,
    getSessionSummary,
    exportToJSON,
    exportToCSV,
    clear,
    reset,
    sessionId,
    eventCount
  };
};