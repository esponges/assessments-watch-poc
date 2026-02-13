import { useRef, useCallback, useEffect, useState } from 'react';
import { GazeEstimator } from './gazeEstimator';
import { useModel } from '../hooks/useModel';
// Note: Gaze estimation now uses Transformers.js models through React Query
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
  const { autoStart = true, onGazeUpdate, onCalibrationNeeded, onError } = options;

  // Get face detection model using React Query
  const { data: faceModel, isLoading: isModelLoading, isSuccess: isModelReady, error: modelError } = useModel('face-detection');

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Gaze estimator error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (onError) {
      onError(err, context);
    }
  }, [onError]);

  // Initialize gaze estimator when model is ready
  const initialize = useCallback(async () => {
    if (!isModelReady || !faceModel) {
      return;
    }

    try {
      setError(null);
      
      // Create gaze estimator
      gazeEstimatorRef.current = new GazeEstimator(options.config);
      const initialStats = gazeEstimatorRef.current.getStats();
      setStats(initialStats);
      
      setIsModelLoaded(true);
      console.log('Gaze estimator initialized successfully with React Query model');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [isModelReady, faceModel, options.config, handleError]);

  // Estimate gaze from video element
  const estimateGaze = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<EnhancedGazeEstimation | null> => {
    if (!gazeEstimatorRef.current || !faceModel || !isModelLoaded) {
      return null;
    }

    try {
      // Get faces from video using Transformers.js model
      const faces = await faceModel(videoElement);
      
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
  }, [faceModel, isModelLoaded, onGazeUpdate, handleError]);

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

  // Update loading progress based on React Query state
  useEffect(() => {
    if (isModelLoading) {
      setModelLoadingProgress(50); // Mid-way progress while loading
    } else if (isModelReady) {
      setModelLoadingProgress(100);
    } else if (modelError) {
      setModelLoadingProgress(0);
      setError(modelError);
    }
  }, [isModelLoading, isModelReady, modelError]);

  // Auto-initialize when model is ready
  useEffect(() => {
    if (autoStart && isModelReady && faceModel) {
      const initAsync = async () => {
        try {
          await initialize();
        } catch (error) {
          console.error('Auto-initialization failed:', error);
        }
      };
      initAsync();
    }
  }, [autoStart, isModelReady, faceModel, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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