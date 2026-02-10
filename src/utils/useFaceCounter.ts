import { useRef, useCallback, useEffect, useState } from 'react';
import { FaceCounter, createFaceCounter } from './faceCounter';
import type { 
  FaceCountEvent,
  FaceCountConfig,
  FaceCountStats,
  FaceCountStatus,
  FaceCounterOptions,
  FaceCountData
} from '../types/faceCounter';
import type { FaceDetectionResult } from '../types/faceDetection';

interface UseFaceCounterOptions {
  onCountChange?: (event: FaceCountEvent) => void | Promise<void>;
  onError?: (error: Error) => void;
  config?: Partial<FaceCountConfig>;
  autoStart?: boolean;
}

interface UseFaceCounterReturn {
  processDetection: (detection: FaceDetectionResult) => FaceCountStatus;
  updateConfig: (config: Partial<FaceCountConfig>) => void;
  reset: () => void;
  getCurrentStatus: () => FaceCountStatus;
  getHistory: () => FaceCountData[];
  status: FaceCountStatus | null;
  stats: FaceCountStats | null;
  config: FaceCountConfig | null;
  error: Error | null;
  isActive: boolean;
}

export const useFaceCounter = (
  options: UseFaceCounterOptions = {}
): UseFaceCounterReturn => {
  const [status, setStatus] = useState<FaceCountStatus | null>(null);
  const [stats, setStats] = useState<FaceCountStats | null>(null);
  const [config, setConfig] = useState<FaceCountConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  const counterRef = useRef<FaceCounter | null>(null);
  const { onCountChange, onError, config: initialConfig, autoStart = true } = options;

  // Handle count change events
  const handleCountChange = useCallback(async (event: FaceCountEvent) => {
    try {
      if (onCountChange) {
        await onCountChange(event);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Face count change callback error:', error);
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [onCountChange, onError]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Face counter error:', error);
    setError(error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Handle stats updates
  const handleStatsUpdate = useCallback((newStats: FaceCountStats) => {
    setStats(newStats);
  }, []);

  // Initialize face counter
  const initialize = useCallback(() => {
    try {
      setError(null);
      
      if (counterRef.current) {
        counterRef.current = null;
      }

      const counterOptions: FaceCounterOptions = {
        onCountChange: handleCountChange,
        onError: handleError,
        onStatsUpdate: handleStatsUpdate,
        config: initialConfig
      };

      counterRef.current = createFaceCounter(counterOptions);
      
      setIsActive(true);
      setConfig(counterRef.current.getConfig());
      setStats(counterRef.current.getStats());
      setStatus(counterRef.current.getCurrentStatus());
      
      console.log('Face counter initialized successfully');
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error);
      throw error;
    }
  }, [handleCountChange, handleError, handleStatsUpdate, initialConfig]);

  // Process face detection results
  const processDetection = useCallback((detection: FaceDetectionResult): FaceCountStatus => {
    if (!counterRef.current) {
      throw new Error('Face counter not initialized. Call initialize() first.');
    }

    const newStatus = counterRef.current.processDetection(detection);
    setStatus(newStatus);
    return newStatus;
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<FaceCountConfig>) => {
    if (counterRef.current) {
      counterRef.current.updateConfig(newConfig);
      setConfig(counterRef.current.getConfig());
    }
  }, []);

  // Reset counter
  const reset = useCallback(() => {
    if (counterRef.current) {
      counterRef.current.reset();
      setStats(counterRef.current.getStats());
      setStatus(counterRef.current.getCurrentStatus());
    }
  }, []);

  // Get current status
  const getCurrentStatus = useCallback((): FaceCountStatus => {
    if (!counterRef.current) {
      throw new Error('Face counter not initialized');
    }
    return counterRef.current.getCurrentStatus();
  }, []);

  // Get history
  const getHistory = useCallback((): FaceCountData[] => {
    if (!counterRef.current) {
      return [];
    }
    return counterRef.current.getHistory();
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoStart) {
      const initAsync = () => {
        try {
          initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
        }
      };
      initAsync();
    }

    return () => {
      setIsActive(false);
      counterRef.current = null;
    };
  }, [autoStart, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsActive(false);
      counterRef.current = null;
    };
  }, []);

  return {
    processDetection,
    updateConfig,
    reset,
    getCurrentStatus,
    getHistory,
    status,
    stats,
    config,
    error,
    isActive
  };
};