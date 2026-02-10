import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  AIModelType, 
  AIModelState, 
  ModelLoadingState, 
  UseAIReturn,
  ModelLoadingProgress 
} from '../types/ai';
import { 
  initializeTensorFlow, 
  loadAIModel, 
  validateModel, 
  cleanupTensorFlow,
  MODEL_CONFIGS 
} from './aiModelLoader';

const createInitialState = (): AIModelState => ({
  models: {
    blazeface: { instance: null, state: 'idle' },
    facemesh: { instance: null, state: 'idle' },
    posenet: { instance: null, state: 'idle' },
    mobilenet: { instance: null, state: 'idle' }
  },
  isInitialized: false,
  isReady: false
});

export const useAI = (): UseAIReturn => {
  const [modelState, setModelState] = useState<AIModelState>(createInitialState);
  const initializationRef = useRef<Promise<void> | null>(null);
  const isUnmountedRef = useRef(false);

  // Initialize TensorFlow.js backend
  const initializeAI = useCallback(async (): Promise<void> => {
    if (initializationRef.current) {
      return initializationRef.current;
    }

    initializationRef.current = (async () => {
      try {
        if (isUnmountedRef.current) return;
        
        setModelState(prev => ({
          ...prev,
          globalError: undefined
        }));

        console.log('Initializing AI system...');
        await initializeTensorFlow();
        
        if (isUnmountedRef.current) return;
        
        setModelState(prev => ({
          ...prev,
          isInitialized: true
        }));
        
        console.log('AI system initialized successfully');
        
      } catch (error) {
        console.error('AI initialization failed:', error);
        
        if (!isUnmountedRef.current) {
          setModelState(prev => ({
            ...prev,
            globalError: error instanceof Error ? error.message : 'AI initialization failed',
            isInitialized: false
          }));
        }
        
        throw error;
      }
    })();

    return initializationRef.current;
  }, []);

  // Load a specific model
  const loadModel = useCallback(async (modelType: AIModelType): Promise<void> => {
    try {
      if (!modelState.isInitialized) {
        await initializeAI();
      }

      if (isUnmountedRef.current) return;

      // Set loading state
      setModelState(prev => ({
        ...prev,
        models: {
          ...prev.models,
          [modelType]: {
            ...prev.models[modelType],
            state: 'loading',
            error: undefined
          }
        }
      }));

      console.log(`Loading ${modelType} model...`);
      const model = await loadAIModel(modelType);
      
      if (isUnmountedRef.current) return;

      // Validate the model
      const isValid = await validateModel(model, modelType);
      
      if (!isValid) {
        throw new Error(`Model validation failed for ${modelType}`);
      }

      if (isUnmountedRef.current) return;

      // Update state with loaded model
      setModelState(prev => {
        const newState = {
          ...prev,
          models: {
            ...prev.models,
            [modelType]: {
              instance: model,
              state: 'loaded' as ModelLoadingState,
              error: undefined,
              loadedAt: new Date()
            }
          }
        };

        // Check if all required models are loaded
        const requiredModels = Object.entries(MODEL_CONFIGS)
          .filter(([, config]) => config.required)
          .map(([type]) => type as AIModelType);
        
        const allRequiredLoaded = requiredModels.every(
          type => newState.models[type].state === 'loaded'
        );

        return {
          ...newState,
          isReady: allRequiredLoaded
        };
      });

      console.log(`${modelType} model loaded successfully`);

    } catch (error) {
      console.error(`Failed to load ${modelType} model:`, error);
      
      if (!isUnmountedRef.current) {
        setModelState(prev => ({
          ...prev,
          models: {
            ...prev.models,
            [modelType]: {
              ...prev.models[modelType],
              state: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }));
      }
      
      throw error;
    }
  }, [modelState.isInitialized, initializeAI]);

  // Load all required models
  const loadAllModels = useCallback(async (): Promise<void> => {
    try {
      const requiredModels = Object.entries(MODEL_CONFIGS)
        .filter(([, config]) => config.required)
        .map(([type]) => type as AIModelType);

      console.log('Loading all required models:', requiredModels);

      // Load models in parallel
      await Promise.all(
        requiredModels.map(modelType => loadModel(modelType))
      );

      console.log('All required models loaded successfully');

    } catch (error) {
      console.error('Failed to load all models:', error);
      throw error;
    }
  }, [loadModel]);

  // Get a specific model instance
  const getModel = useCallback(<T>(modelType: AIModelType): T | null => {
    const modelInfo = modelState.models[modelType];
    return modelInfo?.state === 'loaded' ? (modelInfo.instance as T) : null;
  }, [modelState.models]);

  // Check if a specific model is ready
  const isModelReady = useCallback((modelType: AIModelType): boolean => {
    return modelState.models[modelType]?.state === 'loaded';
  }, [modelState.models]);

  // Reinitialize the entire AI system
  const reinitialize = useCallback(async (): Promise<void> => {
    try {
      console.log('Reinitializing AI system...');
      
      // Clean up existing resources
      cleanupTensorFlow();
      
      // Reset state
      setModelState(createInitialState());
      initializationRef.current = null;
      
      // Reinitialize
      await initializeAI();
      await loadAllModels();
      
      console.log('AI system reinitialized successfully');
      
    } catch (error) {
      console.error('Failed to reinitialize AI system:', error);
      throw error;
    }
  }, [initializeAI, loadAllModels]);

  // Get loading progress for all models
  const getLoadingProgress = useCallback((): ModelLoadingProgress[] => {
    return Object.entries(modelState.models).map(([type, info]) => ({
      modelType: type as AIModelType,
      state: info.state,
      error: info.error
    }));
  }, [modelState.models]);

  // Initialize AI on mount and cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    
    // Auto-initialize TensorFlow.js and load required models
    const initializeAndLoadModels = async () => {
      try {
        await initializeAI();
        await loadAllModels();
        console.log('AI system fully initialized with required models');
      } catch (error) {
        console.error('Auto-initialization failed:', error);
      }
    };
    
    initializeAndLoadModels();

    return () => {
      isUnmountedRef.current = true;
      cleanupTensorFlow();
    };
  }, [initializeAI, loadAllModels]);

  return {
    modelState,
    isReady: modelState.isReady,
    loadModel,
    loadAllModels,
    getModel,
    isModelReady,
    reinitialize,
    getLoadingProgress
  };
};