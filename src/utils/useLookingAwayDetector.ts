import { useRef, useCallback, useEffect, useState } from 'react';
import { LookingAwayDetector } from './lookingAwayDetector';
import type { EnhancedGazeEstimation } from '../types/gazeDetection';
import type {
  LookingAwayConfig,
  LookingAwayEvent,
  LookingAwayStatus,
  LookingAwayStats,
  LookingAwayTimerState,
  LookingAwayWarning,
  LookingAwayDetectionResult,
  LookingAwayDetectionOptions
} from '../types/lookingAwayDetection';

interface UseLookingAwayDetectorOptions extends LookingAwayDetectionOptions {
  autoStart?: boolean;
}

interface UseLookingAwayDetectorReturn {
  processGazeEstimation: (estimation: EnhancedGazeEstimation) => LookingAwayDetectionResult | null;
  getStatus: () => LookingAwayStatus;
  getStats: () => LookingAwayStats;
  updateConfig: (config: Partial<LookingAwayConfig>) => void;
  reset: () => void;
  status: LookingAwayStatus | null;
  stats: LookingAwayStats | null;
  timerState: LookingAwayTimerState | null;
  warning: LookingAwayWarning | null;
  recentEvents: LookingAwayEvent[];
  shouldTriggerScoring: boolean;
  isActive: boolean;
  error: Error | null;
}

export const useLookingAwayDetector = (
  options: UseLookingAwayDetectorOptions = {}
): UseLookingAwayDetectorReturn => {
  const [status, setStatus] = useState<LookingAwayStatus | null>(null);
  const [stats, setStats] = useState<LookingAwayStats | null>(null);
  const [timerState, setTimerState] = useState<LookingAwayTimerState | null>(null);
  const [warning, setWarning] = useState<LookingAwayWarning | null>(null);
  const [recentEvents, setRecentEvents] = useState<LookingAwayEvent[]>([]);
  const [shouldTriggerScoring, setShouldTriggerScoring] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectorRef = useRef<LookingAwayDetector | null>(null);
  const { autoStart = true, ...detectorOptions } = options;

  // Handle looking away start events
  const handleLookingAwayStart = useCallback((event: LookingAwayEvent) => {
    console.log('Looking away started:', event);
    if (options.onLookingAwayStart) {
      options.onLookingAwayStart(event);
    }
  }, [options]);

  // Handle looking away end events
  const handleLookingAwayEnd = useCallback((event: LookingAwayEvent) => {
    console.log('Looking away ended:', event);
    if (options.onLookingAwayEnd) {
      options.onLookingAwayEnd(event);
    }
  }, [options]);

  // Handle looking away scoring events
  const handleLookingAwayScoring = useCallback((event: LookingAwayEvent) => {
    console.log('Looking away scoring:', event);
    if (options.onLookingAwayScoring) {
      options.onLookingAwayScoring(event);
    }
  }, [options]);

  // Handle stats updates
  const handleStatsUpdate = useCallback((newStats: LookingAwayStats) => {
    setStats(newStats);
    if (options.onStatsUpdate) {
      options.onStatsUpdate(newStats);
    }
  }, [options]);

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Looking away detector error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (options.onError) {
      options.onError(err, context);
    }
  }, [options]);

  // Initialize detector
  const initialize = useCallback(() => {
    if (detectorRef.current) {
      return; // Already initialized
    }

    try {
      setError(null);

      const detectorOptionsWithCallbacks: LookingAwayDetectionOptions = {
        ...detectorOptions,
        onLookingAwayStart: handleLookingAwayStart,
        onLookingAwayEnd: handleLookingAwayEnd,
        onLookingAwayScoring: handleLookingAwayScoring,
        onStatsUpdate: handleStatsUpdate,
        onError: handleError
      };

      detectorRef.current = new LookingAwayDetector(detectorOptionsWithCallbacks);
      setIsActive(true);

      // Initialize state
      setStatus(detectorRef.current.getStatus());
      setStats(detectorRef.current.getStats());

      console.log('Looking away detector hook initialized');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [detectorOptions, handleLookingAwayStart, handleLookingAwayEnd, handleLookingAwayScoring, handleStatsUpdate, handleError]);

  // Process gaze estimation
  const processGazeEstimation = useCallback((estimation: EnhancedGazeEstimation): LookingAwayDetectionResult | null => {
    if (!detectorRef.current) {
      return null;
    }

    try {
      const result = detectorRef.current.processGazeEstimation(estimation);
      
      // Update state
      setStatus(result.status);
      setStats(result.stats);
      setTimerState(result.timerState);
      setWarning(result.warning);
      setRecentEvents(result.recentEvents);
      setShouldTriggerScoring(result.shouldTriggerScoring);
      
      return result;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'processGazeEstimation');
      return null;
    }
  }, [handleError]);

  // Get current status
  const getStatus = useCallback((): LookingAwayStatus => {
    if (!detectorRef.current) {
      return {
        isLookingAway: false,
        currentDuration: 0,
        cumulativeDuration: 0,
        lookingAwayStartTime: null,
        lastScoringTime: null,
        currentDirection: null,
        currentSeverity: 'minor',
        scoringEvents: 0,
        totalPointsAwarded: 0
      };
    }
    return detectorRef.current.getStatus();
  }, []);

  // Get current stats
  const getStats = useCallback((): LookingAwayStats => {
    if (!detectorRef.current) {
      return {
        totalLookingAwayTime: 0,
        scoringEvents: 0,
        averageEpisodeDuration: 0,
        maxContinuousDuration: 0,
        lookingAwayFrequency: 0,
        commonDirection: null,
        totalPointsAwarded: 0,
        sessionStartTime: Date.now(),
        patterns: {
          episodes: [],
          averageEpisodeDuration: 0,
          maxEpisodeDuration: 0,
          frequentDirection: null,
          totalEpisodes: 0,
          scoringEpisodes: 0,
          lastEpisodeTime: 0
        }
      };
    }
    return detectorRef.current.getStats();
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<LookingAwayConfig>) => {
    if (detectorRef.current) {
      detectorRef.current.updateConfig(newConfig);
    }
  }, []);

  // Reset detector
  const reset = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
      setStatus(detectorRef.current.getStatus());
      setStats(detectorRef.current.getStats());
    }
    setTimerState(null);
    setWarning(null);
    setRecentEvents([]);
    setShouldTriggerScoring(false);
    setError(null);
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoStart) {
      try {
        initialize();
      } catch (error) {
        console.error('Auto-initialization failed:', error);
      }
    }

    return () => {
      detectorRef.current = null;
      setIsActive(false);
    };
  }, [autoStart, initialize]);

  return {
    processGazeEstimation,
    getStatus,
    getStats,
    updateConfig,
    reset,
    status,
    stats,
    timerState,
    warning,
    recentEvents,
    shouldTriggerScoring,
    isActive,
    error
  };
};
