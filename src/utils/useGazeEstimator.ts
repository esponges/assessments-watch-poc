import { useRef, useCallback, useEffect, useState } from 'react';
import { GazeEstimator } from './gazeEstimator';
import { loadAIModel } from './aiModelLoader';
// Note: Gaze estimation now uses Transformers.js models through AI context
import type {
  GazeConfig,
  GazeStats,
  EnhancedGazeEstimation,
  CalibrationData
} from '../types/gazeDetection';

interface UseGazeEstimatorOptions {
  config?: Partial<GazeConfig>;
  autoStart?: boolean;
  onGazeUpdate?: (estimation: EnhancedGazeEstimation) => void;
  onCalibrationNeeded?: () => void;
  onError?: (error: Error, context?: string) => void;
}

interface UseGazeEstimatorReturn {
  estimateGaze: (videoElement: HTMLVideoElement) => Promise<EnhancedGazeEstimation | null>;
  startCalibration: () => void;
  completeCalibration: () => void;
  reset: () => void;
  updateConfig: (config: Partial<GazeConfig>) => void;
  setCalibration: (calibration: CalibrationData) => void;
  gazeEstimation: EnhancedGazeEstimation | null;
  stats: GazeStats | null;
  isModelLoaded: boolean;
  isCalibrating: boolean;
  error: Error | null;
  modelLoadingProgress: number;
}

export const useGazeEstimator = (
  options: UseGazeEstimatorOptions = {}
): UseGazeEstimatorReturn => {
  const [gazeEstimation, setGazeEstimation] = useState<EnhancedGazeEstimation | null>(null);
  const [stats, setStats] = useState<GazeStats | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);

  const gazeEstimatorRef = useRef<GazeEstimator | null>(null);
  const faceMeshModelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const { autoStart = true, onGazeUpdate, onCalibrationNeeded, onError } = options;

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Gaze estimator error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (onError) {
      onError(err, context);
    }
  }, [onError]);

  // Initialize gaze estimator and load model
  const initialize = useCallback(async () => {
    try {
      setError(null);
      setModelLoadingProgress(0);

      // Create gaze estimator
      gazeEstimatorRef.current = new GazeEstimator(options.config);
      setStats(gazeEstimatorRef.current.getStats());

      // Load FaceMesh model
      console.log('Loading FaceMesh model for gaze estimation...');
      setModelLoadingProgress(20);

      const model = await loadAIModel('face-detection', {
        threshold: 0.75
      });

      setModelLoadingProgress(80);

      faceMeshModelRef.current = model;
      setModelLoadingProgress(100);
      setIsModelLoaded(true);

      console.log('Gaze estimator initialized successfully');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [options.config, handleError]);

  // Estimate gaze from video element
  const estimateGaze = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<EnhancedGazeEstimation | null> => {
    if (!gazeEstimatorRef.current || !faceMeshModelRef.current || !isModelLoaded) {
      return null;
    }

    try {
      // Get faces from video
      const faces = await faceMeshModelRef.current.estimateFaces(videoElement);
      
      if (!faces || faces.length === 0) {
        return null;
      }

      // Estimate gaze
      const estimation = await gazeEstimatorRef.current.estimateGaze(
        faces,
        videoElement.videoWidth,
        videoElement.videoHeight
      );

      if (estimation) {
        setGazeEstimation(estimation);
        setStats(gazeEstimatorRef.current.getStats());

        // Call callback
        if (onGazeUpdate) {
          onGazeUpdate(estimation);
        }
      }

      return estimation;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'estimateGaze');
      return null;
    }
  }, [isModelLoaded, onGazeUpdate, handleError]);

  // Start calibration process
  const startCalibration = useCallback(() => {
    if (!gazeEstimatorRef.current) {
      handleError(new Error('Gaze estimator not initialized'), 'startCalibration');
      return;
    }

    setIsCalibrating(true);
    if (onCalibrationNeeded) {
      onCalibrationNeeded();
    }
  }, [onCalibrationNeeded, handleError]);

  // Complete calibration
  const completeCalibration = useCallback(() => {
    setIsCalibrating(false);
    // Calibration data would be set separately via setCalibration
  }, []);

  // Reset estimator
  const reset = useCallback(() => {
    if (gazeEstimatorRef.current) {
      gazeEstimatorRef.current.reset();
      setStats(gazeEstimatorRef.current.getStats());
    }
    setGazeEstimation(null);
    setIsCalibrating(false);
    setError(null);
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<GazeConfig>) => {
    if (gazeEstimatorRef.current) {
      gazeEstimatorRef.current.updateConfig(newConfig);
    }
  }, []);

  // Set calibration data
  const setCalibration = useCallback((calibration: CalibrationData) => {
    if (gazeEstimatorRef.current) {
      gazeEstimatorRef.current.setCalibration(calibration);
      setStats(gazeEstimatorRef.current.getStats());
    }
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoStart) {
      const initAsync = async () => {
        try {
          await initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
        }
      };
      initAsync();
    }

    return () => {
      // Cleanup
      if (faceMeshModelRef.current && typeof faceMeshModelRef.current.dispose === 'function') {
        faceMeshModelRef.current.dispose();
      }
      faceMeshModelRef.current = null;
      gazeEstimatorRef.current = null;
    };
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (faceMeshModelRef.current && typeof faceMeshModelRef.current.dispose === 'function') {
        faceMeshModelRef.current.dispose();
      }
      faceMeshModelRef.current = null;
      gazeEstimatorRef.current = null;
    };
  }, []);

  return {
    estimateGaze,
    startCalibration,
    completeCalibration,
    reset,
    updateConfig,
    setCalibration,
    gazeEstimation,
    stats,
    isModelLoaded,
    isCalibrating,
    error,
    modelLoadingProgress
  };
};