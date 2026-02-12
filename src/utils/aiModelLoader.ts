import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as blazeface from '@tensorflow-models/blazeface';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@mediapipe/face_mesh';
import type { AIModelType, ModelConfig, ModelLoadingState } from '../types/ai';

// Model configurations
export const MODEL_CONFIGS: Record<AIModelType, ModelConfig> = {
  blazeface: {
    name: 'BlazeFace',
    type: 'blazeface',
    required: true,
    description: 'Lightweight face detection model for real-time processing'
  },
  facemesh: {
    name: 'MediaPipe Face Mesh',
    type: 'facemesh',
    required: false,
    description: 'Detailed facial landmark detection for gaze estimation'
  },
  posenet: {
    name: 'PoseNet',
    type: 'posenet',
    required: false,
    description: 'Human pose estimation for body tracking'
  },
  mobilenet: {
    name: 'MobileNet',
    type: 'mobilenet',
    required: false,
    description: 'General object detection and classification'
  }
};

// Initialize TensorFlow.js backend
export const initializeTensorFlow = async (): Promise<void> => {
  try {
    console.log('Initializing TensorFlow.js...');
    
    // Try WebGL first, fallback to CPU
    try {
      await tf.setBackend('webgl');
      console.log('TensorFlow.js WebGL backend initialized');
    } catch (webglError) {
      console.warn('WebGL backend failed, falling back to CPU:', webglError);
      await tf.setBackend('cpu');
      console.log('TensorFlow.js CPU backend initialized');
    }

    // Wait for backend to be ready
    await tf.ready();
    
    console.log('TensorFlow.js ready:', {
      backend: tf.getBackend(),
      version: tf.version.tfjs,
      memory: tf.memory()
    });

  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    throw new Error(`TensorFlow.js initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Load a specific model with error handling and retries
export const loadAIModel = async (
  modelType: AIModelType,
  options?: Record<string, unknown>,
  maxRetries: number = 3
): Promise<unknown> => {
  const config = MODEL_CONFIGS[modelType];
  
  if (!config) {
    throw new Error(`Unknown model type: ${modelType}`);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Loading ${config.name} (attempt ${attempt}/${maxRetries})`);
      
      let model: unknown;
      
      switch (modelType) {
        case 'blazeface':
          // We'll load BlazeFace in the next step
          model = await loadBlazeFaceModel(options);
          break;
        
        case 'facemesh':
          model = await loadFaceMeshModel(options);
          break;
        
        case 'posenet':
          // Future implementation  
          throw new Error('PoseNet model not yet implemented');
          
        case 'mobilenet':
          // Future implementation
          throw new Error('MobileNet model not yet implemented');
          
        default:
          throw new Error(`Unsupported model type: ${modelType}`);
      }

      console.log(`${config.name} loaded successfully`);
      return model;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to load ${config.name} (attempt ${attempt}):`, lastError);
      
      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error(`Failed to load ${config.name} after ${maxRetries} attempts`);
};

// Load FaceMesh model for detailed landmark detection
const loadFaceMeshModel = async (options?: Record<string, unknown>): Promise<faceLandmarksDetection.FaceLandmarksDetector> => {
  try {
    console.log('Loading FaceMesh model with options:', options);
    
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
      refineLandmarks: true,
      maxFaces: 1,
      ...options
    };

    const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
    
    console.log('FaceMesh model loaded successfully');
    return detector;
    
  } catch (error) {
    console.error('Failed to load FaceMesh model:', error);
    throw new Error(`FaceMesh loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Load BlazeFace model for face detection
const loadBlazeFaceModel = async (options?: Record<string, unknown>): Promise<blazeface.BlazeFaceModel> => {
  try {
    console.log('Loading BlazeFace model with options:', options);
    
    const model = await blazeface.load({
      maxFaces: 1,
      inputWidth: 320,
      inputHeight: 240,
      iouThreshold: 0.3,
      scoreThreshold: 0.75,
      ...options
    });
    
    console.log('BlazeFace model loaded successfully');
    return model;
    
  } catch (error) {
    console.error('Failed to load BlazeFace model:', error);
    throw new Error(`BlazeFace loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Validate that a loaded model is working correctly
export const validateModel = async (
  model: unknown,
  modelType: AIModelType
): Promise<boolean> => {
  try {
    if (!model || typeof model !== 'object') {
      return false;
    }

    // Basic validation - check if model has expected methods
    const modelObj = model as Record<string, unknown>;
    
    switch (modelType) {
      case 'blazeface':
        return typeof modelObj.estimateFaces === 'function';
      
      case 'facemesh':
        return typeof modelObj.estimateFaces === 'function';
      
      default:
        return true; // Basic existence check for other models
    }
    
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
    blazeface: '1.2 MB',
    facemesh: '2.8 MB', 
    posenet: '12.7 MB',
    mobilenet: '16.4 MB'
  };
  
  return sizes[modelType] || 'Unknown';
};

// Get supported backends for each model
const getSupportedBackends = (modelType: AIModelType): string[] => {
  // Most TensorFlow.js models support both WebGL and CPU
  return ['webgl', 'cpu'];
};

// Clean up TensorFlow.js resources
export const cleanupTensorFlow = (): void => {
  try {
    // Dispose of tensors and clean up memory
    tf.disposeVariables();
    
    const memoryInfo = tf.memory();
    console.log('TensorFlow.js cleanup completed:', {
      numTensors: memoryInfo.numTensors,
      numDataBuffers: memoryInfo.numDataBuffers,
      numBytes: memoryInfo.numBytes
    });
    
  } catch (error) {
    console.error('Error during TensorFlow.js cleanup:', error);
  }
};