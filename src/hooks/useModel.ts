import { useQuery, useQueries } from '@tanstack/react-query';
import type { AIModelType } from '../types/ai';
import { loadAIModel, initializeTransformers, MODEL_CONFIGS } from '../utils/aiModelLoader';

// Initialize Transformers.js once globally
let isTransformersInitialized = false;
const initializeOnce = async () => {
  if (!isTransformersInitialized) {
    await initializeTransformers();
    isTransformersInitialized = true;
  }
};

// Query key factory for models
const modelQueryKeys = {
  model: (type: AIModelType) => ['model', type] as const,
  allModels: () => ['models'] as const,
}

// Load a single model
const loadModelWithInit = async (modelType: AIModelType): Promise<any> => {
  // Ensure Transformers.js is initialized first
  await initializeOnce();
  
  // Load the specific model
  return loadAIModel(modelType);
};

// Hook to use a single AI model
export const useModel = (modelType: AIModelType) => {
  return useQuery({
    queryKey: modelQueryKeys.model(modelType),
    queryFn: () => loadModelWithInit(modelType),
    enabled: true,
    staleTime: Infinity, // Models never go stale
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};

// Hook to preload a model without using it immediately
export const useModelPreload = (modelType: AIModelType) => {
  return useQuery({
    queryKey: modelQueryKeys.model(modelType),
    queryFn: () => loadModelWithInit(modelType),
    enabled: true,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
};

// Hook to load all required models
export const useModels = () => {
  const requiredModels = Object.entries(MODEL_CONFIGS)
    .filter(([, config]) => config.required)
    .map(([type]) => type as AIModelType);

  const queries = useQueries({
    queries: requiredModels.map((modelType) => ({
      queryKey: modelQueryKeys.model(modelType),
      queryFn: () => loadModelWithInit(modelType),
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
    })),
  });

  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const isSuccess = queries.every(query => query.isSuccess);
  const errors = queries.filter(query => query.error).map(query => query.error);

  // Create models object with type safety
  const models = requiredModels.reduce((acc, modelType, index) => {
    acc[modelType] = queries[index].data || null;
    return acc;
  }, {} as Record<AIModelType, any>);

  return {
    models,
    isLoading,
    isError,
    isSuccess,
    errors,
    // Helper to check if a specific model is ready
    isModelReady: (modelType: AIModelType): boolean => {
      const query = queries.find((_, i) => requiredModels[i] === modelType);
      return query?.isSuccess ?? false;
    },
    // Helper to get a specific model
    getModel: (modelType: AIModelType): any => {
      return models[modelType] || null;
    },
  };
};

// Hook to get loading progress for all models
export const useModelsProgress = () => {
  const requiredModels = Object.entries(MODEL_CONFIGS)
    .filter(([, config]) => config.required)
    .map(([type]) => type as AIModelType);

  const queries = useQueries({
    queries: requiredModels.map((modelType) => ({
      queryKey: modelQueryKeys.model(modelType),
      queryFn: () => loadModelWithInit(modelType),
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
    })),
  });

  return requiredModels.map((modelType, index) => ({
    modelType,
    state: queries[index].isLoading ? 'loading' : 
           queries[index].isError ? 'error' : 
           queries[index].isSuccess ? 'loaded' : 'idle',
    error: queries[index].error?.message,
  }));
};