import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
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
  private model: blazeface.BlazeFaceModel | null = null;
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

  async initialize(providedModel?: blazeface.BlazeFaceModel): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      if (providedModel) {
        console.log('Using provided BlazeFace model...');
        this.model = providedModel;
        this.isInitialized = true;
        console.log('Face detector initialized with provided model');
        this.updateStats();
        return;
      }

      // TEMPORARY: Skip model loading to prevent infinite loop
      // The main AI system should handle BlazeFace model loading
      console.log('Face detector initialized without model (using main AI system)');
      this.isInitialized = true;
      this.updateStats();
      
      // OLD CODE - causing infinite loop:
      // console.log('Initializing BlazeFace model...');
      // this.model = await blazeface.load();
      // console.log('BlazeFace model loaded successfully');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to initialize BlazeFace:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  async detectFaces(
    imageData: ImageData | HTMLCanvasElement | tf.Tensor,
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
      let inputElement: ImageData | HTMLCanvasElement | HTMLVideoElement;
      let frameWidth: number;
      let frameHeight: number;

      // Convert input to compatible format for BlazeFace
      if (imageData instanceof ImageData) {
        frameWidth = imageData.width;
        frameHeight = imageData.height;
        // Create canvas from ImageData for BlazeFace
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
      } else {
        // For tensor input, we need to convert to canvas
        const tensor = imageData as tf.Tensor;
        const shape = tensor.shape;
        frameHeight = shape[0];
        frameWidth = shape[1];
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d')!;
        
        // Convert tensor to pixels and create ImageData
        const pixelData = await tf.browser.toPixels(tensor);
        const imgData = new ImageData(
          new Uint8ClampedArray(pixelData.buffer),
          frameWidth,
          frameHeight
        );
        ctx.putImageData(imgData, 0, 0);
        inputElement = canvas;
        
        // Dispose the tensor
        tensor.dispose();
      }

      // Run face detection
      const predictions = await this.model.estimateFaces(inputElement, false);

      // Convert predictions to our format
      const faces: DetectedFace[] = predictions
        .filter(prediction => {
          const probability = Array.isArray(prediction.probability) 
            ? prediction.probability[0] 
            : prediction.probability;
          return (typeof probability === 'number' ? probability : 0) >= this.config.scoreThreshold;
        })
        .slice(0, this.config.maxFaces)
        .map((prediction, index) => {
          const topLeft = prediction.topLeft as [number, number];
          const bottomRight = prediction.bottomRight as [number, number];
          const probability = Array.isArray(prediction.probability) 
            ? prediction.probability[0] 
            : prediction.probability;
          const confidence = typeof probability === 'number' ? probability : 0;
          
          const face: DetectedFace = {
            id: `face_${timestamp}_${index}`,
            boundingBox: {
              topLeft,
              bottomRight,
              width: bottomRight[0] - topLeft[0],
              height: bottomRight[1] - topLeft[1]
            },
            confidence,
            probability: confidence
          };

          // Add landmarks if enabled and available
          if (this.config.enableLandmarks && prediction.landmarks) {
            face.landmarks = prediction.landmarks as Array<[number, number]>;
          }

          return face;
        });

      const processingTime = performance.now() - startTime;
      
      const result: FaceDetectionResult = {
        faces,
        frameData: {
          width: frameWidth,
          height: frameHeight,
          timestamp
        },
        processingTime
      };

      // Update statistics
      this.frameCount++;
      this.totalProcessingTime += processingTime;
      this.stats.totalDetections += faces.length;
      this.stats.averageProcessingTime = this.totalProcessingTime / this.frameCount;
      this.stats.averageFacesPerFrame = this.stats.totalDetections / this.frameCount;

      // Update FPS
      this.updateFPS();

      // Clean up tensor if we created it
      if (!(imageData instanceof tf.Tensor3D)) {
        inputTensor.dispose();
      }

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