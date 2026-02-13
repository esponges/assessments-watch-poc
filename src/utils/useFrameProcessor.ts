import { useRef, useCallback, useEffect, useState } from 'react';
import { FrameExtractor, createFrameExtractor } from './frameExtractor';
import type { 
  FrameData, 
  FrameExtractionConfig, 
  FrameProcessingStats,
  FrameExtractionOptions 
} from '../types/frameProcessing';

interface UseFrameProcessorOptions {
  onFrame?: (frameData: FrameData) => void | Promise<void>;
  onError?: (error: Error) => void;
  config?: Partial<FrameExtractionConfig>;
  autoStart?: boolean;
}

interface UseFrameProcessorReturn {
  startProcessing: () => void;
  stopProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  updateConfig: (config: Partial<FrameExtractionConfig>) => void;
  isProcessing: boolean;
  stats: FrameProcessingStats | null;
  error: Error | null;
}

export const useFrameProcessor = (
  videoElement: HTMLVideoElement | null,
  options: UseFrameProcessorOptions = {}
): UseFrameProcessorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<FrameProcessingStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const extractorRef = useRef<FrameExtractor | null>(null);
  const { onFrame, onError, config, autoStart = false } = options;

  // Handle frame processing
  const handleFrame = useCallback(async (frameData: FrameData) => {
    try {
      if (onFrame) {
        await onFrame(frameData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Frame processing error:', error);
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [onFrame, onError]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Frame extraction error:', error);
    setError(error);
    setIsProcessing(false);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Handle stats updates
  const handleStatsUpdate = useCallback((newStats: FrameProcessingStats) => {
    setStats(newStats);
  }, []);

  // Initialize extractor when video element is available - synchronizing with external video system
  useEffect(() => {
    if (!videoElement) {
      if (extractorRef.current) {
        extractorRef.current.stop();
        extractorRef.current = null;
      }
      setIsProcessing(false);
      setStats(null);
      return;
    }

    // Wait for video to be ready
    const initializeExtractor = () => {
      if (videoElement.readyState < 2) {
        return;
      }

      try {
        const extractorOptions: FrameExtractionOptions = {
          videoElement,
          onFrame: handleFrame,
          onError: handleError,
          onStatsUpdate: handleStatsUpdate,
          config
        };

        extractorRef.current = createFrameExtractor(extractorOptions);
        
        if (autoStart) {
          extractorRef.current.start();
          setIsProcessing(true);
        }

        console.log('Frame extractor initialized for video element');
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
      }
    };

    if (videoElement.readyState >= 2) {
      initializeExtractor();
    } else {
      videoElement.addEventListener('loadeddata', initializeExtractor, { once: true });
    }

    return () => {
      if (extractorRef.current) {
        extractorRef.current.stop();
        extractorRef.current = null;
      }
      setIsProcessing(false);
    };
  }, [videoElement, handleFrame, handleError, handleStatsUpdate, config, autoStart]);

  // Start processing
  const startProcessing = useCallback(() => {
    if (!extractorRef.current) {
      setError(new Error('Frame extractor not initialized'));
      return;
    }

    try {
      extractorRef.current.start();
      setIsProcessing(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error);
    }
  }, [handleError]);

  // Stop processing
  const stopProcessing = useCallback(() => {
    if (extractorRef.current) {
      extractorRef.current.stop();
    }
    setIsProcessing(false);
  }, []);

  // Pause processing
  const pauseProcessing = useCallback(() => {
    if (extractorRef.current) {
      extractorRef.current.pause();
    }
  }, []);

  // Resume processing
  const resumeProcessing = useCallback(() => {
    if (extractorRef.current) {
      extractorRef.current.resume();
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<FrameExtractionConfig>) => {
    if (extractorRef.current) {
      extractorRef.current.updateConfig(newConfig);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (extractorRef.current) {
        extractorRef.current.stop();
      }
    };
  }, []);

  return {
    startProcessing,
    stopProcessing,
    pauseProcessing,
    resumeProcessing,
    updateConfig,
    isProcessing,
    stats,
    error
  };
};