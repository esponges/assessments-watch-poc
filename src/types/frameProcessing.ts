import type { Pipeline } from '@xenova/transformers';
import type { FaceDetectionResult } from './faceDetection';

export interface FrameData {
  imageData: ImageData;
  timestamp: number;
  width: number;
  height: number;
  frameId: string;
  faceDetection?: FaceDetectionResult;
}

export interface FrameExtractionConfig {
  interval: number; // milliseconds between frame captures
  targetWidth?: number; // resize target width
  targetHeight?: number; // resize target height
  maintainAspectRatio: boolean;
  enableDebugCanvas: boolean;
  maxFrameRate: number; // maximum frames per second
  skipFramesWhenBusy: boolean; // skip frames if processing is behind
  enableFaceDetection: boolean; // enable real-time face detection
}

export interface FrameProcessingStats {
  totalFrames: number;
  processedFrames: number;
  skippedFrames: number;
  averageFPS: number;
  currentFPS: number;
  averageProcessingTime: number; // milliseconds
  lastFrameTime: number;
  isProcessing: boolean;
}

export interface FrameProcessor {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRunning: boolean;
  stats: FrameProcessingStats;
  config: FrameExtractionConfig;
  updateConfig: (config: Partial<FrameExtractionConfig>) => void;
}

export interface FrameExtractionOptions {
  videoElement: HTMLVideoElement;
  onFrame?: (frameData: FrameData) => void | Promise<void>;
  onError?: (error: Error) => void;
  onStatsUpdate?: (stats: FrameProcessingStats) => void;
  config?: Partial<FrameExtractionConfig>;
  faceDetectionModel?: Pipeline; // AI model for face detection
}

export interface CanvasUtils {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  debugCanvas?: HTMLCanvasElement;
  debugContext?: CanvasRenderingContext2D;
}

export interface ResizeOptions {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio: boolean;
  scaleMode: 'contain' | 'cover' | 'stretch';
}

export interface ResizeResult {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}