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

// AI Manager Singleton to prevent multiple initializations
class AIManager {
  private static instance: AIManager | null = null;
  private initializationPromise: Promise<void> | null = null;
  private modelLoadingPromises: Map<AIModelType, Promise<unknown>> = new Map();
  private isInitialized: boolean = false;

  static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  async initializeTensorFlow(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('Initializing TensorFlow.js (singleton)...');
        await initializeTensorFlow();
        this.isInitialized = true;
        console.log('TensorFlow.js initialized successfully (singleton)');
      } catch (error) {
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async loadModel(modelType: AIModelType): Promise<unknown> {
    // Ensure TensorFlow is initialized first
    await this.initializeTensorFlow();

    // Check if already loading
    const existingPromise = this.modelLoadingPromises.get(modelType);
    if (existingPromise) {
      console.log(`${modelType} model already loading (singleton), waiting...`);
      return existingPromise;
    }

    const loadPromise = (async () => {
      try {
        console.log(`Loading ${modelType} model (singleton)...`);
        const model = await loadAIModel(modelType);
        
        const isValid = await validateModel(model, modelType);
        if (!isValid) {
          throw new Error(`Model validation failed for ${modelType}`);
        }

        console.log(`${modelType} model loaded successfully (singleton)`);
        return model;
      } finally {
        this.modelLoadingPromises.delete(modelType);
      }
    })();

    this.modelLoadingPromises.set(modelType, loadPromise);
    return loadPromise;
  }

  reset(): void {
    this.initializationPromise = null;
    this.modelLoadingPromises.clear();
    this.isInitialized = false;
  }
}

export const useAI = (): UseAIReturn => {
  const [modelState, setModelState] = useState<AIModelState>(createInitialState);
  const initializationRef = useRef<Promise<void> | null>(null);
  const isUnmountedRef = useRef(false);

  // Initialize TensorFlow.js backend
  const initializeAI = useCallback(async (): Promise<void> => {
    if (initializationRef.current) {
      return initializationRef.current;
    }

    const initPromise = (async () => {
      try {
        if (isUnmountedRef.current) return;
        
        setModelState(prev => ({
          ...prev,
          globalError: undefined
        }));

        console.log('Initializing AI system...');
        const aiManager = AIManager.getInstance();
        await aiManager.initializeTensorFlow();
        
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

    initializationRef.current = initPromise;
    return initPromise;
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
      const aiManager = AIManager.getInstance();
      const model = await aiManager.loadModel(modelType);
      
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
      
      // Reset singleton
      const aiManager = AIManager.getInstance();
      aiManager.reset();
      
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
  }, []); // Remove dependencies to prevent infinite loop

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