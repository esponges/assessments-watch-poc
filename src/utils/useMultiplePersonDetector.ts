import { useRef, useCallback, useEffect, useState } from 'react';
import { MultiplePersonDetector, createMultiplePersonDetector } from './multiplePersonDetector';
import type { 
  MultiplePersonDetectorOptions,
  MultiplePersonDetectorConfig,
  MultiplePersonDetectorStats,
  MultiplePersonEvent,
  MultiplePersonDetectionStatus,
  ScoreStatus
} from '../types/multiplePersonDetector';
import type { FaceCountStatus, FaceCountEvent } from '../types/faceCounter';

interface UseMultiplePersonDetectorOptions extends MultiplePersonDetectorOptions {
  autoStart?: boolean;
}

interface UseMultiplePersonDetectorReturn {
  processDetection: (detection: FaceCountStatus, event?: FaceCountEvent) => void;
  getScoreStatus: () => ScoreStatus;
  getDetectionStatus: () => MultiplePersonDetectionStatus;
  getStats: () => MultiplePersonDetectorStats;
  updateConfig: (config: Partial<MultiplePersonDetectorConfig>) => void;
  reset: () => void;
  dispose: () => void;
  scoreStatus: ScoreStatus | null;
  detectionStatus: MultiplePersonDetectionStatus | null;
  stats: MultiplePersonDetectorStats | null;
  isActive: boolean;
  error: Error | null;
}

export const useMultiplePersonDetector = (
  options: UseMultiplePersonDetectorOptions = {}
): UseMultiplePersonDetectorReturn => {
  const [scoreStatus, setScoreStatus] = useState<ScoreStatus | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<MultiplePersonDetectionStatus | null>(null);
  const [stats, setStats] = useState<MultiplePersonDetectorStats | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const detectorRef = useRef<MultiplePersonDetector | null>(null);
  const { onScoreChange, onMultiplePersonEvent, onError, autoStart = true, ...detectorOptions } = options;

  // Handle score change events
  const handleScoreChange = useCallback((newScoreStatus: ScoreStatus) => {
    setScoreStatus(newScoreStatus);
    if (onScoreChange) {
      onScoreChange(newScoreStatus);
    }
  }, [onScoreChange]);

  // Handle multiple person events
  const handleMultiplePersonEvent = useCallback((event: MultiplePersonEvent) => {
    if (onMultiplePersonEvent) {
      onMultiplePersonEvent(event);
    }
  }, [onMultiplePersonEvent]);

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Multiple person detector error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (onError) {
      onError(err, context);
    }
  }, [onError]);

  // Initialize detector
  const initialize = useCallback(() => {
    if (detectorRef.current) {
      return; // Already initialized
    }

    try {
      setError(null);

      const detectorOptionsWithCallbacks: MultiplePersonDetectorOptions = {
        ...detectorOptions,
        onScoreChange: handleScoreChange,
        onMultiplePersonEvent: handleMultiplePersonEvent,
        onError: handleError
      };

      detectorRef.current = createMultiplePersonDetector(detectorOptionsWithCallbacks);
      setIsActive(true);

      // Initialize state
      setScoreStatus(detectorRef.current.getScoreStatus());
      setDetectionStatus(detectorRef.current.getDetectionStatus());
      setStats(detectorRef.current.getStats());

      console.log('Multiple person detector hook initialized');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [detectorOptions, handleScoreChange, handleMultiplePersonEvent, handleError]);

  // Process detection
  const processDetection = useCallback((detection: FaceCountStatus, event?: FaceCountEvent) => {
    if (!detectorRef.current) {
      throw new Error('Multiple person detector not initialized. Call initialize() first.');
    }

    try {
      detectorRef.current.processDetection(detection, event);
      
      // Update state
      setDetectionStatus(detectorRef.current.getDetectionStatus());
      setStats(detectorRef.current.getStats());
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'processDetection');
    }
  }, [handleError]);

  // Get score status
  const getScoreStatus = useCallback((): ScoreStatus => {
    if (!detectorRef.current) {
      return {
        totalScore: 0,
        isFlagged: false,
        flagLevel: 'none',
        scoreHistory: []
      };
    }
    return detectorRef.current.getScoreStatus();
  }, []);

  // Get detection status
  const getDetectionStatus = useCallback((): MultiplePersonDetectionStatus => {
    if (!detectorRef.current) {
      return {
        isMultiplePersonsDetected: false,
        faceCount: 0,
        confidence: 0,
        detectionStartTime: null,
        currentDuration: 0,
        isSustained: false
      };
    }
    return detectorRef.current.getDetectionStatus();
  }, []);

  // Get stats
  const getStats = useCallback((): MultiplePersonDetectorStats => {
    if (!detectorRef.current) {
      return {
        totalDetections: 0,
        sustainedDetections: 0,
        averageDetectionDuration: 0,
        maxSimultaneousFaces: 0,
        totalPointsAwarded: 0,
        detectionConfidenceAverage: 0,
        sessionStartTime: Date.now()
      };
    }
    return detectorRef.current.getStats();
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<MultiplePersonDetectorConfig>) => {
    if (detectorRef.current) {
      detectorRef.current.updateConfig(newConfig);
    }
  }, []);

  // Reset detector
  const reset = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
      setScoreStatus(detectorRef.current.getScoreStatus());
      setDetectionStatus(detectorRef.current.getDetectionStatus());
      setStats(detectorRef.current.getStats());
      setError(null);
    }
  }, []);

  // Dispose detector
  const dispose = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }
    setIsActive(false);
    setScoreStatus(null);
    setDetectionStatus(null);
    setStats(null);
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
      dispose();
    };
  }, [autoStart, initialize, dispose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    processDetection,
    getScoreStatus,
    getDetectionStatus,
    getStats,
    updateConfig,
    reset,
    dispose,
    scoreStatus,
    detectionStatus,
    stats,
    isActive,
    error
  };
};