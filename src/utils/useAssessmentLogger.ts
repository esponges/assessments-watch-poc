import { useRef, useCallback, useEffect, useState } from 'react';
import { AssessmentLogger } from './assessmentLogger';
import type { MonitoringEvent } from '../types/events';
import type { ScoringStats, Flag } from '../types/scoring';
import type {
  AssessmentLogEntry,
  SessionState,
  AssessmentLoggerConfig,
  AssessmentLoggerOptions,
  AssessmentLogExport,
  LoggingUpdate
} from '../types/assessmentLogging';

interface UseAssessmentLoggerOptions extends AssessmentLoggerOptions {
  autoStart?: boolean;
}

interface UseAssessmentLoggerReturn {
  startSession: (assessmentId?: string, studentId?: string) => string;
  endSession: () => AssessmentLogEntry | null;
  addEvent: (event: MonitoringEvent) => void;
  addFlag: (flag: Flag) => void;
  updateScoringStats: (stats: ScoringStats) => void;
  getCurrentLog: () => AssessmentLogEntry | null;
  exportLog: (format?: 'json' | 'json-pretty' | 'json-compressed') => AssessmentLogExport | null;
  downloadLog: (format?: 'json' | 'json-pretty' | 'json-compressed') => void;
  sessionState: SessionState | null;
  currentLog: AssessmentLogEntry | null;
  isSessionActive: boolean;
  isLogging: boolean;
  error: Error | null;
  lastUpdate: LoggingUpdate | null;
}

export const useAssessmentLogger = (
  options: UseAssessmentLoggerOptions = {}
): UseAssessmentLoggerReturn => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentLog, setCurrentLog] = useState<AssessmentLogEntry | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LoggingUpdate | null>(null);

  const loggerRef = useRef<AssessmentLogger | null>(null);
  const { autoStart = false, ...loggerOptions } = options;

  // Handle log generation events
  const handleLogGenerated = useCallback((log: AssessmentLogEntry) => {
    setCurrentLog(log);
    
    const update: LoggingUpdate = {
      sessionId: log.sessionId,
      timestamp: Date.now(),
      updateType: 'session_ended',
      data: {
        sessionSummary: {
          duration: log.duration,
          totalEvents: log.events.length,
          currentScore: log.totalScore,
          flagged: log.flagged
        }
      }
    };
    
    setLastUpdate(update);
    
    if (options.onLogGenerated) {
      options.onLogGenerated(log);
    }
  }, [options]);

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Assessment logger error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (options.onError) {
      options.onError(err, context);
    }
  }, [options]);

  // Initialize logger
  const initialize = useCallback(() => {
    if (loggerRef.current) {
      return; // Already initialized
    }

    try {
      setError(null);

      const loggerOptionsWithCallbacks: AssessmentLoggerOptions = {
        ...loggerOptions,
        onLogGenerated: handleLogGenerated,
        onError: handleError,
        autoStart: false // We'll start manually
      };

      loggerRef.current = new AssessmentLogger(loggerOptionsWithCallbacks);
      setIsLogging(true);

      console.log('Assessment logger hook initialized');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [loggerOptions, handleLogGenerated, handleError]);

  // Start session
  const startSession = useCallback((assessmentId?: string, studentId?: string): string => {
    if (!loggerRef.current) {
      initialize();
    }

    try {
      if (!loggerRef.current) {
        throw new Error('Logger not initialized');
      }

      const sessionId = loggerRef.current.startSession(assessmentId, studentId);
      setIsSessionActive(true);
      
      // Update state
      const state = loggerRef.current.getSessionState();
      setSessionState(state);
      
      const update: LoggingUpdate = {
        sessionId,
        timestamp: Date.now(),
        updateType: 'event_added',
        data: {
          sessionSummary: {
            duration: 0,
            totalEvents: 0,
            currentScore: 0,
            flagged: false
          }
        }
      };
      setLastUpdate(update);

      return sessionId;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'startSession');
      throw error;
    }
  }, [initialize, handleError]);

  // End session
  const endSession = useCallback((): AssessmentLogEntry | null => {
    if (!loggerRef.current) {
      console.warn('No active logger to end session');
      return null;
    }

    try {
      const finalLog = loggerRef.current.endSession();
      setIsSessionActive(false);
      
      // Update state
      const state = loggerRef.current.getSessionState();
      setSessionState(state);
      setCurrentLog(finalLog);

      return finalLog;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'endSession');
      return null;
    }
  }, [handleError]);

  // Add event
  const addEvent = useCallback((event: MonitoringEvent): void => {
    if (!loggerRef.current || !isSessionActive) {
      return;
    }

    try {
      loggerRef.current.addEvent(event);
      
      // Update state
      const state = loggerRef.current.getSessionState();
      setSessionState(state);
      
      // Create update
      const update: LoggingUpdate = {
        sessionId: state?.session.sessionId || 'unknown',
        timestamp: Date.now(),
        updateType: 'event_added',
        data: {
          event: {
            id: event.id,
            timestamp: event.timestamp,
            type: event.type,
            confidence: event.confidence,
            duration: event.duration,
            details: {} // Will be populated by the logger
          }
        }
      };
      setLastUpdate(update);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'addEvent');
    }
  }, [isSessionActive, handleError]);

  // Add flag
  const addFlag = useCallback((flag: Flag): void => {
    if (!loggerRef.current || !isSessionActive) {
      return;
    }

    try {
      loggerRef.current.addFlag(flag);
      
      // Update state
      const state = loggerRef.current.getSessionState();
      setSessionState(state);
      
      // Create update
      const update: LoggingUpdate = {
        sessionId: state?.session.sessionId || 'unknown',
        timestamp: Date.now(),
        updateType: 'flag_raised',
        data: {
          flag: {
            id: flag.id,
            timestamp: flag.timestamp,
            level: flag.level,
            reason: flag.reason,
            score: flag.score,
            triggeringEventIds: flag.triggeringEvents,
            priority: flag.priority,
            category: flag.category,
            resolved: !flag.isActive
          }
        }
      };
      setLastUpdate(update);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'addFlag');
    }
  }, [isSessionActive, handleError]);

  // Update scoring stats
  const updateScoringStats = useCallback((stats: ScoringStats): void => {
    if (!loggerRef.current || !isSessionActive) {
      return;
    }

    try {
      const previousStats = sessionState?.scoringStats;
      loggerRef.current.updateScoringStats(stats);
      
      // Update state
      const state = loggerRef.current.getSessionState();
      setSessionState(state);
      
      // Create update if score changed
      if (previousStats && previousStats.currentScore !== stats.currentScore) {
        const update: LoggingUpdate = {
          sessionId: state?.session.sessionId || 'unknown',
          timestamp: Date.now(),
          updateType: 'score_changed',
          data: {
            scoreChange: {
              previousScore: previousStats.currentScore,
              newScore: stats.currentScore,
              pointsAwarded: stats.currentScore - previousStats.currentScore,
              reason: 'Score updated'
            }
          }
        };
        setLastUpdate(update);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'updateScoringStats');
    }
  }, [isSessionActive, sessionState?.scoringStats, handleError]);

  // Get current log
  const getCurrentLog = useCallback((): AssessmentLogEntry | null => {
    if (!loggerRef.current) {
      return null;
    }

    try {
      return loggerRef.current.getCurrentLog();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'getCurrentLog');
      return null;
    }
  }, [handleError]);

  // Export log
  const exportLog = useCallback((format: 'json' | 'json-pretty' | 'json-compressed' = 'json-pretty'): AssessmentLogExport | null => {
    if (!loggerRef.current) {
      return null;
    }

    try {
      return loggerRef.current.exportLog(format);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'exportLog');
      return null;
    }
  }, [handleError]);

  // Download log
  const downloadLog = useCallback((format: 'json' | 'json-pretty' | 'json-compressed' = 'json-pretty'): void => {
    const exportResult = exportLog(format);
    if (!exportResult) {
      console.warn('No log data to download');
      return;
    }

    try {
      // Create blob and download
      const blob = new Blob([exportResult.data], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Assessment log downloaded:', exportResult.filename);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'downloadLog');
    }
  }, [exportLog, handleError]);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoStart) {
      try {
        initialize();
        // Auto-start session if IDs are provided
        if (options.assessmentId || options.studentId) {
          startSession(options.assessmentId, options.studentId);
        }
      } catch (error) {
        console.error('Auto-initialization failed:', error);
      }
    }

    return () => {
      if (loggerRef.current) {
        try {
          if (isSessionActive) {
            loggerRef.current.endSession();
          }
          loggerRef.current.destroy();
        } catch (error) {
          console.error('Cleanup failed:', error);
        }
      }
      loggerRef.current = null;
      setIsLogging(false);
      setIsSessionActive(false);
    };
  }, [autoStart, options.assessmentId, options.studentId]);

  return {
    startSession,
    endSession,
    addEvent,
    addFlag,
    updateScoringStats,
    getCurrentLog,
    exportLog,
    downloadLog,
    sessionState,
    currentLog,
    isSessionActive,
    isLogging,
    error,
    lastUpdate
  };
};
