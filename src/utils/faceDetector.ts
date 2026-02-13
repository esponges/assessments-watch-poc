import type { Pipeline } from '@xenova/transformers';
import type { 
  FaceDetectionResult, 
  DetectedFace, 
  FaceDetectionConfig, 
  FaceDetectionStats,
  FaceDetectionOptions 
} from '../types/faceDetection';

const DEFAULT_CONFIG: FaceDetectionConfig = {
  maxFaces: 5,
  scoreThreshold: 0.75,
  iouThreshold: 0.3,
  enableLandmarks: true,
  debugMode: false
};

export class FaceDetector {
  private model: Pipeline | null = null;
  private config: FaceDetectionConfig;
  private stats: FaceDetectionStats;
  private isInitialized = false;
  private frameCount = 0;
  private totalProcessingTime = 0;
  private lastFpsUpdate = 0;
  private fpsFrameCount = 0;

  private options: FaceDetectionOptions;

  constructor(
    options: FaceDetectionOptions = {}
  ) {
    this.options = options;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.stats = {
      totalDetections: 0,
      averageProcessingTime: 0,
      currentFPS: 0,
      averageFacesPerFrame: 0,
      isDetecting: false
    };
  }

  async initialize(providedModel?: Pipeline): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      if (providedModel) {
        console.log('Using provided Transformers.js model...');
        this.model = providedModel;
        this.isInitialized = true;
        console.log('Face detector initialized with provided model');
        this.updateStats();
        return;
      }

      // Skip model loading - the AI context should provide the model
      // This prevents duplicate model loading
      console.log('Face detector initialized without model (expecting model from AI context)');
      this.isInitialized = true;
      this.updateStats();
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to initialize BlazeFace:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  async detectFaces(
    imageData: ImageData | HTMLCanvasElement | HTMLImageElement,
    timestamp: number = Date.now()
  ): Promise<FaceDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Face detector not initialized. Call initialize() first.');
    }

    // TEMPORARY: Return mock results when no model is available
    if (!this.model) {
      console.log('Face detector running without model - returning mock results');
      return {
        faces: [],
        timestamp,
        frameWidth: 0,
        frameHeight: 0,
        processingTime: 0,
        confidence: 0,
        error: null
      };
    }

    const startTime = performance.now();
    this.stats.isDetecting = true;
    this.updateStats();

    try {
      let inputElement: HTMLCanvasElement | HTMLImageElement;
      let frameWidth: number;
      let frameHeight: number;

      // Convert input to compatible format for Transformers.js
      if (imageData instanceof ImageData) {
        frameWidth = imageData.width;
        frameHeight = imageData.height;
        // Create canvas from ImageData
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
        inputElement = canvas;
      } else if (imageData instanceof HTMLCanvasElement) {
        frameWidth = imageData.width;
        frameHeight = imageData.height;
        inputElement = imageData;
      } else if (imageData instanceof HTMLImageElement) {
        frameWidth = imageData.naturalWidth || imageData.width;
        frameHeight = imageData.naturalHeight || imageData.height;
        inputElement = imageData;
      } else {
        throw new Error('Unsupported input type for face detection');
      }

      // Run object detection to find faces
      const detections = await this.model(inputElement, {
        threshold: this.config.scoreThreshold,
        percentage: true
      });

      // Filter for face-related detections and convert to our format
      const faceLabels = ['person', 'face', 'head'];
      const faces: DetectedFace[] = (Array.isArray(detections) ? detections : [])
        .filter((detection: any) => {
          const label = detection.label?.toLowerCase() || '';
          return faceLabels.some(faceLabel => label.includes(faceLabel)) && 
                 detection.score >= this.config.scoreThreshold;
        })
        .slice(0, this.config.maxFaces)
        .map((detection: any, index: number) => {
          const box = detection.box;
          const topLeft: [number, number] = [box.xmin * frameWidth / 100, box.ymin * frameHeight / 100];
          const bottomRight: [number, number] = [box.xmax * frameWidth / 100, box.ymax * frameHeight / 100];
          
          const face: DetectedFace = {
            id: `face_${timestamp}_${index}`,
            boundingBox: {
              topLeft,
              bottomRight,
              width: bottomRight[0] - topLeft[0],
              height: bottomRight[1] - topLeft[1]
            },
            confidence: detection.score,
            probability: detection.score
          };

          return face;
        });

      const processingTime = performance.now() - startTime;
      
      const result: FaceDetectionResult = {
        faces,
        timestamp,
        frameWidth,
        frameHeight,
        processingTime,
        confidence: faces.length > 0 ? faces.reduce((sum, face) => sum + face.confidence, 0) / faces.length : 0,
        error: null
      };

      // Update statistics
      this.frameCount++;
      this.totalProcessingTime += processingTime;
      this.stats.totalDetections += faces.length;
      this.stats.averageProcessingTime = this.totalProcessingTime / this.frameCount;
      this.stats.averageFacesPerFrame = this.stats.totalDetections / this.frameCount;

      // Update FPS
      this.updateFPS();

      // No cleanup needed for Transformers.js

      this.stats.isDetecting = false;
      this.updateStats();

      // Trigger callbacks
      if (this.options.onDetection) {
        await this.options.onDetection(result);
      }

      if (this.config.debugMode) {
        console.log('Face detection result:', {
          facesFound: faces.length,
          processingTime: `${processingTime.toFixed(2)}ms`,
          averageProcessingTime: `${this.stats.averageProcessingTime.toFixed(2)}ms`,
          currentFPS: this.stats.currentFPS.toFixed(1)
        });
      }

      return result;

    } catch (error) {
      this.stats.isDetecting = false;
      this.updateStats();
      
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Face detection error:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  private updateFPS(): void {
    const now = performance.now();
    this.fpsFrameCount++;

    if (this.lastFpsUpdate === 0) {
      this.lastFpsUpdate = now;
      return;
    }

    const timeDiff = now - this.lastFpsUpdate;
    if (timeDiff >= 1000) { // Update every second
      this.stats.currentFPS = (this.fpsFrameCount / timeDiff) * 1000;
      this.fpsFrameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private updateStats(): void {
    this.options.onStatsUpdate?.(this.stats);
  }

  updateConfig(newConfig: Partial<FaceDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Face detection config updated:', this.config);
  }

  getStats(): FaceDetectionStats {
    return { ...this.stats };
  }

  getConfig(): FaceDetectionConfig {
    return { ...this.config };
  }

  reset(): void {
    this.frameCount = 0;
    this.totalProcessingTime = 0;
    this.fpsFrameCount = 0;
    this.lastFpsUpdate = 0;
    this.stats = {
      totalDetections: 0,
      averageProcessingTime: 0,
      currentFPS: 0,
      averageFacesPerFrame: 0,
      isDetecting: false
    };
    this.updateStats();
  }

  dispose(): void {
    if (this.model) {
      // BlazeFace models don't have a dispose method, but we can clear our reference
      this.model = null;
    }
    this.isInitialized = false;
    this.reset();
  }
}

export const createFaceDetector = (options?: FaceDetectionOptions): FaceDetector => {
  return new FaceDetector(options);
};