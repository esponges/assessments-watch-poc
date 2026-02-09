import { useState } from 'react';
import type { UseAIReturn, AIModelType } from '../types/ai';
import { MODEL_CONFIGS, getModelInfo } from '../utils/aiModelLoader';
import './AIStatus.css';

interface AIStatusProps {
  ai: UseAIReturn;
  compact?: boolean;
}

const AIStatus: React.FC<AIStatusProps> = ({ ai, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { modelState, loadAllModels, reinitialize, getLoadingProgress } = ai;

  const loadingProgress = getLoadingProgress();
  
  const getStatusColor = () => {
    if (modelState.globalError) return 'error';
    if (!modelState.isInitialized) return 'loading';
    if (modelState.isReady) return 'ready';
    return 'partial';
  };

  const getStatusText = () => {
    if (modelState.globalError) return 'AI System Error';
    if (!modelState.isInitialized) return 'Initializing AI...';
    if (modelState.isReady) return 'AI System Ready';
    
    const loadingModels = loadingProgress.filter(p => p.state === 'loading');
    if (loadingModels.length > 0) {
      return `Loading ${loadingModels.map(p => MODEL_CONFIGS[p.modelType].name).join(', ')}...`;
    }
    
    return 'AI System Partial';
  };

  const getStatusIcon = () => {
    const status = getStatusColor();
    switch (status) {
      case 'ready': return '✅';
      case 'loading': return '⏳';
      case 'error': return '❌';
      case 'partial': return '⚠️';
      default: return '🤖';
    }
  };

  const handleLoadModels = async () => {
    try {
      await loadAllModels();
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleReinitialize = async () => {
    try {
      await reinitialize();
    } catch (error) {
      console.error('Failed to reinitialize:', error);
    }
  };

  if (compact) {
    return (
      <div className={`ai-status-compact ${getStatusColor()}`}>
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className="ai-status">
      <div className="ai-status-header">
        <div className="ai-status-summary">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="status-info">
            <h3>AI Monitoring System</h3>
            <p className={`status-text ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>
        
        <div className="ai-status-actions">
          {!modelState.isReady && !modelState.globalError && (
            <button 
              onClick={handleLoadModels}
              className="load-models-btn"
              disabled={loadingProgress.some(p => p.state === 'loading')}
            >
              Load AI Models
            </button>
          )}
          
          {modelState.globalError && (
            <button 
              onClick={handleReinitialize}
              className="reinit-btn"
            >
              Retry
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-btn"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {modelState.globalError && (
        <div className="ai-error">
          <strong>Error:</strong> {modelState.globalError}
        </div>
      )}

      {isExpanded && (
        <div className="ai-status-details">
          <div className="system-info">
            <div className="info-item">
              <span className="label">TensorFlow.js:</span>
              <span className="value">{modelState.isInitialized ? 'Initialized' : 'Not Ready'}</span>
            </div>
            <div className="info-item">
              <span className="label">Backend:</span>
              <span className="value">WebGL/CPU</span>
            </div>
          </div>

          <div className="models-status">
            <h4>AI Models</h4>
            {Object.entries(MODEL_CONFIGS).map(([type, config]) => {
              const modelType = type as AIModelType;
              const modelInfo = modelState.models[modelType];
              const info = getModelInfo(modelType);
              
              return (
                <div key={type} className="model-item">
                  <div className="model-header">
                    <div className="model-info">
                      <span className="model-name">{config.name}</span>
                      {config.required && <span className="required-badge">Required</span>}
                    </div>
                    <div className={`model-status ${modelInfo.state}`}>
                      {modelInfo.state === 'loaded' && '✅'}
                      {modelInfo.state === 'loading' && '⏳'}
                      {modelInfo.state === 'error' && '❌'}
                      {modelInfo.state === 'idle' && '⭕'}
                      <span className="status-label">
                        {modelInfo.state.charAt(0).toUpperCase() + modelInfo.state.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="model-details">
                    <div className="detail">
                      <span className="detail-label">Size:</span>
                      <span className="detail-value">{info.estimatedSize}</span>
                    </div>
                    <div className="detail">
                      <span className="detail-label">Purpose:</span>
                      <span className="detail-value">{config.description}</span>
                    </div>
                    {modelInfo.loadedAt && (
                      <div className="detail">
                        <span className="detail-label">Loaded:</span>
                        <span className="detail-value">
                          {modelInfo.loadedAt.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {modelInfo.error && (
                      <div className="model-error">
                        <strong>Error:</strong> {modelInfo.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStatus;