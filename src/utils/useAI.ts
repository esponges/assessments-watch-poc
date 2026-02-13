import type { UseAIReturn } from '../types/ai';
import { useAIContext } from '../contexts/AIContext';

export const useAI = (): UseAIReturn => {
  // Simply delegate to the AI context
  const context = useAIContext();
  
  return {
    modelState: context.modelState,
    isReady: context.isReady,
    loadModel: context.loadModel,
    loadAllModels: context.loadAllModels,
    getModel: context.getModel,
    isModelReady: context.isModelReady,
    reinitialize: context.reinitialize,
    getLoadingProgress: context.getLoadingProgress
  };
};