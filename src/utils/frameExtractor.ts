import * as tf from '@tensorflow/tfjs';
import type {
  FrameData,
  FrameExtractionConfig,
  FrameProcessingStats,
  FrameProcessor,
  FrameExtractionOptions,
  CanvasUtils,
  ResizeOptions,
  ResizeResult
} from '../types/frameProcessing';

// Default configuration
const DEFAULT_CONFIG: FrameExtractionConfig = {
  interval: 500, // 2 FPS
  targetWidth: 640,
  targetHeight: 480,
  maintainAspectRatio: true,
  enableDebugCanvas: false,
  maxFrameRate: 5, // Maximum 5 FPS for performance
  skipFramesWhenBusy: true
};

// Calculate optimal dimensions for resizing
export const calculateResize = (options: ResizeOptions): ResizeResult => {
  const { sourceWidth, sourceHeight, targetWidth, targetHeight, maintainAspectRatio, scaleMode } = options;
  
  if (!targetWidth && !targetHeight) {
    return {
      width: sourceWidth,
      height: sourceHeight,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };
  }

  const finalTargetWidth = targetWidth || sourceWidth;
  const finalTargetHeight = targetHeight || sourceHeight;

  if (!maintainAspectRatio) {
    return {
      width: finalTargetWidth,
      height: finalTargetHeight,
      scale: Math.min(finalTargetWidth / sourceWidth, finalTargetHeight / sourceHeight),
      offsetX: 0,
      offsetY: 0
    };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = finalTargetWidth / finalTargetHeight;

  let scale: number;
  let width: number;
  let height: number;

  if (scaleMode === 'contain') {
    // Fit entire source within target (letterboxing)
    scale = Math.min(finalTargetWidth / sourceWidth, finalTargetHeight / sourceHeight);
    width = Math.round(sourceWidth * scale);
    height = Math.round(sourceHeight * scale);
  } else if (scaleMode === 'cover') {
    // Fill entire target (cropping)
    scale = Math.max(finalTargetWidth / sourceWidth, finalTargetHeight / sourceHeight);
    width = finalTargetWidth;
    height = finalTargetHeight;
  } else {
    // stretch - maintain target dimensions
    width = finalTargetWidth;
    height = finalTargetHeight;
    scale = Math.min(finalTargetWidth / sourceWidth, finalTargetHeight / sourceHeight);
  }

  const offsetX = Math.round((finalTargetWidth - width) / 2);
  const offsetY = Math.round((finalTargetHeight - height) / 2);

  return { width, height, scale, offsetX, offsetY };
};

// Create canvas utilities
export const createCanvasUtils = (width: number, height: number, enableDebug: boolean = false): CanvasUtils => {
  // Main canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to get 2D canvas context');
  }

  const utils: CanvasUtils = { canvas, context };

  // Debug canvas
  if (enableDebug) {
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = width;
    debugCanvas.height = height;
    debugCanvas.style.border = '2px solid #00ff00';
    debugCanvas.style.position = 'fixed';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.zIndex = '9999';
    debugCanvas.style.width = '160px';
    debugCanvas.style.height = '120px';
    debugCanvas.title = 'Frame Extraction Debug Canvas';

    const debugContext = debugCanvas.getContext('2d');
    if (debugContext) {
      utils.debugCanvas = debugCanvas;
      utils.debugContext = debugContext;
      document.body.appendChild(debugCanvas);
    }
  }

  return utils;
};

// Convert ImageData to TensorFlow.js tensor
export const imageDataToTensor = (imageData: ImageData): tf.Tensor3D => {
  // Convert ImageData to tensor (height, width, channels)
  const tensor = tf.browser.fromPixels(imageData, 3);
  return tensor as tf.Tensor3D;
};

// Create frame data object
export const createFrameData = (
  imageData: ImageData, 
  timestamp: number,
  createTensor: boolean = false
): FrameData => {
  const frameId = `frame_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  
  const frameData: FrameData = {
    imageData,
    timestamp,
    width: imageData.width,
    height: imageData.height,
    frameId
  };

  if (createTensor) {
    frameData.tensor = imageDataToTensor(imageData);
  }

  return frameData;
};

// Main frame extractor class
export class FrameExtractor implements FrameProcessor {
  private videoElement: HTMLVideoElement;
  private canvasUtils: CanvasUtils;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onFrameCallback?: (frameData: FrameData) => void | Promise<void>;
  private onErrorCallback?: (error: Error) => void;
  private onStatsCallback?: (stats: FrameProcessingStats) => void;
  private currentlyProcessing: boolean = false;

  public config: FrameExtractionConfig;
  public stats: FrameProcessingStats;
  public isRunning: boolean = false;

  constructor(options: FrameExtractionOptions) {
    this.videoElement = options.videoElement;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.onFrameCallback = options.onFrame;
    this.onErrorCallback = options.onError;
    this.onStatsCallback = options.onStatsUpdate;

    // Initialize stats
    this.stats = {
      totalFrames: 0,
      processedFrames: 0,
      skippedFrames: 0,
      averageFPS: 0,
      currentFPS: 0,
      averageProcessingTime: 0,
      lastFrameTime: 0,
      isProcessing: false
    };

    // Create canvas utilities
    const targetWidth = this.config.targetWidth || this.videoElement.videoWidth || 640;
    const targetHeight = this.config.targetHeight || this.videoElement.videoHeight || 480;
    
    this.canvasUtils = createCanvasUtils(
      targetWidth,
      targetHeight,
      this.config.enableDebugCanvas
    );

    console.log('FrameExtractor initialized:', {
      targetWidth,
      targetHeight,
      config: this.config
    });
  }

  start(): void {
    if (this.isRunning) {
      console.warn('FrameExtractor already running');
      return;
    }

    if (!this.videoElement || this.videoElement.readyState < 2) {
      throw new Error('Video element not ready for frame extraction');
    }

    console.log('Starting frame extraction...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    // Use interval-based extraction for better control
    this.intervalId = setInterval(() => {
      this.captureFrame();
    }, this.config.interval);
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('Stopping frame extraction...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.cleanup();
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (!this.isRunning) return;
    
    this.intervalId = setInterval(() => {
      this.captureFrame();
    }, this.config.interval);
  }

  updateConfig(newConfig: Partial<FrameExtractionConfig>): void {
    const oldInterval = this.config.interval;
    this.config = { ...this.config, ...newConfig };

    // Restart interval if it changed
    if (this.isRunning && oldInterval !== this.config.interval) {
      this.pause();
      this.resume();
    }

    // Update debug canvas visibility
    if (newConfig.enableDebugCanvas !== undefined) {
      if (newConfig.enableDebugCanvas && !this.canvasUtils.debugCanvas) {
        this.addDebugCanvas();
      } else if (!newConfig.enableDebugCanvas && this.canvasUtils.debugCanvas) {
        this.removeDebugCanvas();
      }
    }

    console.log('FrameExtractor config updated:', this.config);
  }

  private captureFrame(): void {
    try {
      const now = performance.now();
      
      // Check if we should skip this frame
      if (this.config.skipFramesWhenBusy && this.currentlyProcessing) {
        this.stats.skippedFrames++;
        return;
      }

      // FPS limiting
      const timeSinceLastFrame = now - this.lastFrameTime;
      const minInterval = 1000 / this.config.maxFrameRate;
      
      if (timeSinceLastFrame < minInterval) {
        return;
      }

      this.stats.totalFrames++;
      this.currentlyProcessing = true;
      this.stats.isProcessing = true;

      // Calculate resize dimensions
      const resize = calculateResize({
        sourceWidth: this.videoElement.videoWidth,
        sourceHeight: this.videoElement.videoHeight,
        targetWidth: this.config.targetWidth,
        targetHeight: this.config.targetHeight,
        maintainAspectRatio: this.config.maintainAspectRatio,
        scaleMode: 'contain'
      });

      // Clear canvas
      this.canvasUtils.context.clearRect(0, 0, this.canvasUtils.canvas.width, this.canvasUtils.canvas.height);

      // Draw video frame to canvas
      this.canvasUtils.context.drawImage(
        this.videoElement,
        resize.offsetX,
        resize.offsetY,
        resize.width,
        resize.height
      );

      // Update debug canvas
      if (this.canvasUtils.debugCanvas && this.canvasUtils.debugContext) {
        this.canvasUtils.debugContext.clearRect(0, 0, this.canvasUtils.debugCanvas.width, this.canvasUtils.debugCanvas.height);
        this.canvasUtils.debugContext.drawImage(this.canvasUtils.canvas, 0, 0);
        
        // Add frame info
        this.canvasUtils.debugContext.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.canvasUtils.debugContext.fillRect(0, 0, 200, 20);
        this.canvasUtils.debugContext.fillStyle = 'black';
        this.canvasUtils.debugContext.font = '12px monospace';
        this.canvasUtils.debugContext.fillText(`FPS: ${this.stats.currentFPS.toFixed(1)}`, 5, 15);
      }

      // Get image data
      const imageData = this.canvasUtils.context.getImageData(
        0, 0, 
        this.canvasUtils.canvas.width, 
        this.canvasUtils.canvas.height
      );

      // Create frame data
      const frameData = createFrameData(imageData, now, true);

      // Update stats
      this.updateStats(now);
      this.stats.processedFrames++;
      
      // Call frame callback
      if (this.onFrameCallback) {
        const result = this.onFrameCallback(frameData);
        if (result instanceof Promise) {
          result.finally(() => {
            this.currentlyProcessing = false;
            this.stats.isProcessing = false;
          });
        } else {
          this.currentlyProcessing = false;
          this.stats.isProcessing = false;
        }
      } else {
        this.currentlyProcessing = false;
        this.stats.isProcessing = false;
      }

      this.lastFrameTime = now;

    } catch (error) {
      this.currentlyProcessing = false;
      this.stats.isProcessing = false;
      console.error('Frame capture error:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private updateStats(now: number): void {
    const timeDelta = now - this.stats.lastFrameTime;
    
    if (this.stats.lastFrameTime > 0 && timeDelta > 0) {
      this.stats.currentFPS = 1000 / timeDelta;
      
      // Exponential moving average for smoothed FPS
      const alpha = 0.1;
      this.stats.averageFPS = alpha * this.stats.currentFPS + (1 - alpha) * this.stats.averageFPS;
    }

    this.stats.lastFrameTime = now;

    // Call stats callback
    if (this.onStatsCallback) {
      this.onStatsCallback({ ...this.stats });
    }
  }

  private addDebugCanvas(): void {
    if (this.canvasUtils.debugCanvas) return;

    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = this.canvasUtils.canvas.width;
    debugCanvas.height = this.canvasUtils.canvas.height;
    debugCanvas.style.border = '2px solid #00ff00';
    debugCanvas.style.position = 'fixed';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.zIndex = '9999';
    debugCanvas.style.width = '160px';
    debugCanvas.style.height = '120px';

    const debugContext = debugCanvas.getContext('2d');
    if (debugContext) {
      this.canvasUtils.debugCanvas = debugCanvas;
      this.canvasUtils.debugContext = debugContext;
      document.body.appendChild(debugCanvas);
    }
  }

  private removeDebugCanvas(): void {
    if (this.canvasUtils.debugCanvas) {
      document.body.removeChild(this.canvasUtils.debugCanvas);
      this.canvasUtils.debugCanvas = undefined;
      this.canvasUtils.debugContext = undefined;
    }
  }

  private cleanup(): void {
    this.removeDebugCanvas();
    
    // Dispose of any TensorFlow tensors if needed
    // This will be handled by the consuming code
  }
}

// Factory function for easier usage
export const createFrameExtractor = (options: FrameExtractionOptions): FrameExtractor => {
  return new FrameExtractor(options);
};