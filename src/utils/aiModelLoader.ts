import { pipeline, env, Pipeline } from '@xenova/transformers';
import type { AIModelType, ModelConfig } from '../types/ai';

// Configure Transformers.js environment
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Model configurations for Transformers.js
export const MODEL_CONFIGS: Record<AIModelType, ModelConfig> = {
  'object-detection': {
    name: 'RT-DETR Object Detection',
    type: 'object-detection',
    url: 'Xenova/rt-detr-l',
    required: true,
    description: 'Real-time object detection for face and object detection'
  },
  'face-detection': {
    name: 'YOLOS Face Detection',
    type: 'face-detection', 
    url: 'Xenova/yolos-tiny',
    required: true,
    description: 'YOLO-based face detection optimized for speed'
  },
  'pose-estimation': {
    name: 'ViTPose',
    type: 'pose-estimation',
    url: 'Xenova/vitpose-base',
    required: false,
    description: 'Vision transformer for pose estimation and gaze analysis'
  },
  'image-classification': {
    name: 'ViT Image Classification',
    type: 'image-classification',
    url: 'Xenova/vit-base-patch16-224',
    required: false,
    description: 'Vision transformer for general image classification'
  }
};

// Initialize Transformers.js environment
export const initializeTransformers = async (): Promise<void> => {
  try {
    console.log('Initializing Transformers.js...');
    
    // Set up environment configuration
    env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
    env.backends.onnx.wasm.simd = true;
    
    console.log('Transformers.js environment configured:', {
      threads: env.backends.onnx.wasm.numThreads,
      simd: env.backends.onnx.wasm.simd,
      allowRemoteModels: env.allowRemoteModels
    });

  } catch (error) {
    console.error('Failed to initialize Transformers.js:', error);
    throw new Error(`Transformers.js initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Load a specific model using Transformers.js pipeline
export const loadAIModel = async (
  modelType: AIModelType,
  options?: Record<string, unknown>,
  maxRetries: number = 3
): Promise<Pipeline> => {
  const config = MODEL_CONFIGS[modelType];
  
  if (!config || !config.url) {
    throw new Error(`Unknown model type or missing URL: ${modelType}`);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Loading ${config.name} (attempt ${attempt}/${maxRetries})`);
      
      // Get the pipeline task type from model type
      const task = getTaskFromModelType(modelType);
      
      // Load model using Transformers.js pipeline
      const model = await pipeline(task, config.url, {
        ...options,
        device: 'wasm',
        dtype: 'fp32'
      });

      console.log(`${config.name} loaded successfully`);
      return model;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to load ${config.name} (attempt ${attempt}):`, lastError);
      
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to load ${config.name} after ${maxRetries} attempts`);
};

// Map model types to Transformers.js pipeline tasks
const getTaskFromModelType = (modelType: AIModelType): string => {
  const taskMap: Record<AIModelType, string> = {
    'object-detection': 'object-detection',
    'face-detection': 'object-detection', 
    'pose-estimation': 'image-classification', // Using classification for pose features
    'image-classification': 'image-classification'
  };
  
  return taskMap[modelType] || 'object-detection';
};

// Helper function to process detection results
export const processDetectionResults = (results: any[], threshold: number = 0.5) => {
  if (!Array.isArray(results)) {
    return [];
  }
  
  return results
    .filter(result => result.score >= threshold)
    .map(result => ({
      label: result.label,
      score: result.score,
      box: result.box
    }));
};

// Validate that a loaded Transformers.js model is working correctly
export const validateModel = async (
  model: Pipeline,
  modelType: AIModelType
): Promise<boolean> => {
  try {
    if (!model || typeof model !== 'function') {
      return false;
    }

    // Test model with a simple dummy input
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 224;
    dummyCanvas.height = 224;
    const ctx = dummyCanvas.getContext('2d');
    if (!ctx) return false;
    
    // Create a simple test pattern
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 224, 224);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 50, 124, 124);
    
    // Test the model
    const testResult = await model(dummyCanvas);
    
    // Check if result has expected structure
    return Array.isArray(testResult) || (testResult && typeof testResult === 'object');
    
  } catch (error) {
    console.error(`Model validation failed for ${modelType}:`, error);
    return false;
  }
};

// Get model loading progress information
export const getModelInfo = (modelType: AIModelType) => {
  const config = MODEL_CONFIGS[modelType];
  return {
    ...config,
    estimatedSize: getEstimatedModelSize(modelType),
    supportedBackends: getSupportedBackends(modelType)
  };
};

// Estimate model size for progress indication
const getEstimatedModelSize = (modelType: AIModelType): string => {
  const sizes: Record<AIModelType, string> = {
    'object-detection': '45 MB',
    'face-detection': '15 MB', 
    'pose-estimation': '85 MB',
    'image-classification': '85 MB'
  };
  
  return sizes[modelType] || 'Unknown';
};

// Get supported backends for Transformers.js models
const getSupportedBackends = (modelType: AIModelType): string[] => {
  // Transformers.js supports ONNX Runtime backends
  return ['wasm', 'webgl', 'cpu'];
};

// Clean up Transformers.js resources
export const cleanupTransformers = (): void => {
  try {
    // Transformers.js automatically handles memory management
    // We can optionally clear caches or dispose models if needed
    console.log('Transformers.js cleanup completed');
    
  } catch (error) {
    console.error('Error during Transformers.js cleanup:', error);
  }
};

// Export renamed initialization function
export { initializeTransformers as initializeTensorFlow };
export { cleanupTransformers as cleanupTensorFlow };
