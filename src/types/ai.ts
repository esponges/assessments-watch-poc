export type AIModelType = 'blazeface' | 'facemesh' | 'posenet' | 'mobilenet';

export type ModelLoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'failed';

export interface ModelConfig {
  name: string;
  type: AIModelType;
  url?: string;
  options?: Record<string, unknown>;
  required?: boolean;
  description?: string;
}

export interface ModelLoadingProgress {
  modelType: AIModelType;
  state: ModelLoadingState;
  progress?: number;
  error?: string;
}

export interface AIModelState {
  models: Record<AIModelType, {
    instance: unknown | null;
    state: ModelLoadingState;
    error?: string;
    loadedAt?: Date;
  }>;
  isInitialized: boolean;
  isReady: boolean;
  globalError?: string;
}

export interface AIModelLoaderConfig {
  models: ModelConfig[];
  autoLoad?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface UseAIReturn {
  modelState: AIModelState;
  isReady: boolean;
  loadModel: (type: AIModelType) => Promise<void>;
  loadAllModels: () => Promise<void>;
  getModel: <T>(type: AIModelType) => T | null;
  isModelReady: (type: AIModelType) => boolean;
  reinitialize: () => Promise<void>;
  getLoadingProgress: () => ModelLoadingProgress[];
}