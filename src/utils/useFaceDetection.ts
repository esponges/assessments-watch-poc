import { useRef, useCallback, useEffect, useState } from 'react';
import { FaceDetector, createFaceDetector } from './faceDetector';
import { useModel } from '../hooks/useModel';
import type { 
  FaceDetectionResult, 
  FaceDetectionConfig, 
  FaceDetectionStats,
  FaceDetectionOptions 
} from '../types/faceDetection';

interface UseFaceDetectionOptions {
  onDetection?: (result: FaceDetectionResult) => void | Promise<void>;
  onError?: (error: Error) => void;
  config?: Partial<FaceDetectionConfig>;
  autoStart?: boolean;
}

interface UseFaceDetectionReturn {
  initialize: () => Promise<void>;
  detectFaces: (imageData: ImageData | HTMLCanvasElement | HTMLImageElement, timestamp?: number) => Promise<FaceDetectionResult>;
  updateConfig: (config: Partial<FaceDetectionConfig>) => void;
  reset: () => void;
  dispose: () => void;
  isInitialized: boolean;
  stats: FaceDetectionStats | null;
  error: Error | null;
  config: FaceDetectionConfig | null;
}

export const useFaceDetection = (
  options: UseFaceDetectionOptions = {}
): UseFaceDetectionReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<FaceDetectionStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [config, setConfig] = useState<FaceDetectionConfig | null>(null);
  
  const detectorRef = useRef<FaceDetector | null>(null);
  const { onDetection, onError, config: initialConfig, autoStart = false } = options;
  
  // Get face detection model using React Query
  const { data: faceModel, isLoading: isModelLoading, isSuccess: isModelReady } = useModel('face-detection');

  // Handle detection results
  const handleDetection = useCallback(async (result: FaceDetectionResult) => {
    try {
      if (onDetection) {
        await onDetection(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Face detection callback error:', error);
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [onDetection, onError]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Face detection error:', error);
    setError(error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Handle stats updates
  const handleStatsUpdate = useCallback((newStats: FaceDetectionStats) => {
    setStats(newStats);
  }, []);

  // Initialize face detector
  const initialize = useCallback(async () => {
    try {
      setError(null);
      
      console.log('[useFaceDetection] Initializing face detector...', {
        aiReady: isModelReady,
        faceModelReady: isModelReady
      });
      
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }

      const detectorOptions: FaceDetectionOptions = {
        onDetection: handleDetection,
        onError: handleError,
        onStatsUpdate: handleStatsUpdate,
        config: initialConfig
      };

      detectorRef.current = createFaceDetector(detectorOptions);
      
      // Get the face detection model from AI context
      if (isModelReady && faceModel) {
        const model = faceModel;
        console.log('[useFaceDetection] Got face detection model from React Query:', {
          hasModel: !!model,
          modelType: typeof model
        });
        await detectorRef.current.initialize(model);
      } else {
        console.log('[useFaceDetection] AI not ready, initializing without model');
        await detectorRef.current.initialize();
      }
      
      setIsInitialized(true);
      setConfig(detectorRef.current.getConfig());
      setStats(detectorRef.current.getStats());
      
      console.log('[useFaceDetection] Face detection initialized successfully');
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useFaceDetection] Initialization failed:', error);
      handleError(error);
      throw error;
    }
  }, [handleDetection, handleError, handleStatsUpdate, initialConfig, isModelReady, faceModel]);

  // Detect faces in image data
  const detectFaces = useCallback(async (
    imageData: ImageData | HTMLCanvasElement | HTMLImageElement, 
    timestamp: number = Date.now()
  ): Promise<FaceDetectionResult> => {
    if (!detectorRef.current) {
      throw new Error('Face detector not initialized. Call initialize() first.');
    }

    return await detectorRef.current.detectFaces(imageData, timestamp);
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<FaceDetectionConfig>) => {
    if (detectorRef.current) {
      detectorRef.current.updateConfig(newConfig);
      setConfig(detectorRef.current.getConfig());
    }
  }, []);

  // Reset statistics
  const reset = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
      setStats(detectorRef.current.getStats());
    }
  }, []);

  // Dispose detector
  const dispose = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }
    setIsInitialized(false);
    setStats(null);
    setConfig(null);
    setError(null);
  }, []);

  // Auto-initialize if requested - this effect synchronizes with external face detection system
  useEffect(() => {
    if (autoStart) {
      const init = async () => {
        try {
          await initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
        }
      };
      
      init();
    }

    return () => {
      dispose();
    };
  }, [autoStart, initialize, dispose]);

  return {
    initialize,
    detectFaces,
    updateConfig,
    reset,
    dispose,
    isInitialized,
    stats,
    error,
    config
  };
};
