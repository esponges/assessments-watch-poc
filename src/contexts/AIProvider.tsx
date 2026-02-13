import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { 
  AIModelType, 
  AIModelState, 
  ModelLoadingState,
  ModelLoadingProgress 
} from '../types/ai';
import { 
  initializeTensorFlow, 
  loadAIModel, 
  validateModel, 
  cleanupTensorFlow,
  MODEL_CONFIGS 
} from '../utils/aiModelLoader';
import { AIContext, type AIContextValue } from './AIContext';

const createInitialState = (): AIModelState => ({
  models: {
    'object-detection': { instance: null, state: 'idle' },
    'face-detection': { instance: null, state: 'idle' },
    'pose-estimation': { instance: null, state: 'idle' },
    'image-classification': { instance: null, state: 'idle' }
  },
  isInitialized: false,
  isReady: false
});

interface AIProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
}

const AIProvider: React.FC<AIProviderProps> = ({ 
  children, 
  autoInitialize = true 
}) => {
  const [modelState, setModelState] = useState<AIModelState>(createInitialState);
  const initializationRef = useRef<Promise<void> | null>(null);
  const modelLoadingPromises = useRef<Map<AIModelType, Promise<unknown>>>(new Map());
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

        console.log('Initializing AI system (context)...');
        await initializeTensorFlow();
        
        if (isUnmountedRef.current) return;
        
        setModelState(prev => ({
          ...prev,
          isInitialized: true
        }));
        
        console.log('AI system initialized successfully (context)');
        
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
    // Check if this model is already being loaded
    const existingPromise = modelLoadingPromises.current.get(modelType);
    if (existingPromise) {
      console.log(`${modelType} model already loading (context), waiting...`);
      await existingPromise;
      return;
    }

    const loadPromise = (async () => {
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

        console.log(`Loading ${modelType} model (context)...`);
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

        console.log(`${modelType} model loaded successfully (context)`);

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
      } finally {
        // Clear the promise when done
        modelLoadingPromises.current.delete(modelType);
      }
    })();

    modelLoadingPromises.current.set(modelType, loadPromise);
    await loadPromise;
  }, [modelState.isInitialized, initializeAI]);

  // Load all required models
  const loadAllModels = useCallback(async (): Promise<void> => {
    try {
      const requiredModels = Object.entries(MODEL_CONFIGS)
        .filter(([, config]) => config.required)
        .map(([type]) => type as AIModelType);

      console.log('Loading all required models (context):', requiredModels);

      // Load models in parallel
      await Promise.all(
        requiredModels.map(modelType => loadModel(modelType))
      );

      console.log('All required models loaded successfully (context)');

    } catch (error) {
      console.error('Failed to load all models:', error);
      throw error;
    }
  }, [loadModel]);

  // Get a specific model instance
  const getModel = useCallback(<T,>(modelType: AIModelType): T | null => {
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
      console.log('Reinitializing AI system (context)...');
      
      // Clean up existing resources
      cleanupTensorFlow();
      
      // Reset state
      setModelState(createInitialState());
      initializationRef.current = null;
      modelLoadingPromises.current.clear();
      
      // Reinitialize
      await initializeAI();
      await loadAllModels();
      
      console.log('AI system reinitialized successfully (context)');
      
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

  // Auto-initialize on mount
  useEffect(() => {
    isUnmountedRef.current = false;
    
    if (autoInitialize) {
      const initializeAndLoadModels = async () => {
        try {
          await initializeAI();
          await loadAllModels();
          console.log('AI system fully initialized with required models (context)');
        } catch (error) {
          console.error('Auto-initialization failed (context):', error);
        }
      };
      
      initializeAndLoadModels();
    }

    return () => {
      isUnmountedRef.current = true;
      cleanupTensorFlow();
    };
  }, [autoInitialize, initializeAI, loadAllModels]);

  const contextValue: AIContextValue = {
    modelState,
    isReady: modelState.isReady,
    initializeAI,
    loadModel,
    loadAllModels,
    getModel,
    isModelReady,
    reinitialize,
    getLoadingProgress
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

export default AIProvider;