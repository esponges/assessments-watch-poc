import { useContext } from 'react';
import { AIContext, type AIContextValue } from '../contexts/AIContext';

export const useAIContext = (): AIContextValue => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within an AIProvider');
  }
  return context;
};