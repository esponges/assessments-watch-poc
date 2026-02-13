import { createContext } from 'react';
import type { 
  AIModelType,
  AIModelState, 
  ModelLoadingProgress 
} from '../types/ai';

export interface AIContextValue {
  modelState: AIModelState;
  isReady: boolean;
  initializeAI: () => Promise<void>;
  loadModel: (modelType: AIModelType) => Promise<void>;
  loadAllModels: () => Promise<void>;
  getModel: <T,>(modelType: AIModelType) => T | null;
  isModelReady: (modelType: AIModelType) => boolean;
  reinitialize: () => Promise<void>;
  getLoadingProgress: () => ModelLoadingProgress[];
}

export const AIContext = createContext<AIContextValue | null>(null);