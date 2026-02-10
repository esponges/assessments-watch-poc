import { useState } from 'react';
import type { FrameProcessingStats, FrameExtractionConfig } from '../types/frameProcessing';
import './FrameProcessorStatus.css';

interface FrameProcessorStatusProps {
  isProcessing: boolean;
  stats: FrameProcessingStats | null;
  config: FrameExtractionConfig | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigUpdate: (config: Partial<FrameExtractionConfig>) => void;
  error?: Error | null;
  compact?: boolean;
}

const FrameProcessorStatus: React.FC<FrameProcessorStatusProps> = ({
  isProcessing,
  stats,
  config,
  onStart,
  onStop,
  onPause,
  onResume,
  onConfigUpdate,
  error,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState<Partial<FrameExtractionConfig>>({});

  const getStatusColor = () => {
    if (error) return 'error';
    if (isProcessing) return 'processing';
    return 'idle';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isProcessing) return '🎯';
    return '⏸️';
  };

  const getStatusText = () => {
    if (error) return 'Frame Processing Error';
    if (isProcessing) return 'Processing Frames';
    return 'Frame Processing Idle';
  };

  const formatNumber = (num: number | undefined, decimals: number = 1): string => {
    return num?.toFixed(decimals) || '0';
  };

  const handleConfigChange = (key: keyof FrameExtractionConfig, value: number | boolean) => {
    setTempConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyConfig = () => {
    if (Object.keys(tempConfig).length > 0) {
      onConfigUpdate(tempConfig);
      setTempConfig({});
      setShowConfig(false);
    }
  };

  const resetConfig = () => {
    setTempConfig({});
    setShowConfig(false);
  };

  if (compact) {
    return (
      <div className={`frame-processor-compact ${getStatusColor()}`}>
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        {stats && (
          <span className="compact-stats">
            {formatNumber(stats.currentFPS)} FPS | {stats.processedFrames} frames
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="frame-processor-status">
      <div className="frame-processor-header">
        <div className="status-summary">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="status-info">
            <h3>Frame Processing</h3>
            <p className={`status-text ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>

        <div className="frame-processor-controls">
          {!isProcessing && !error && (
            <button onClick={onStart} className="control-btn start">
              ▶️ Start
            </button>
          )}
          
          {isProcessing && (
            <>
              <button onClick={onPause} className="control-btn pause">
                ⏸️ Pause
              </button>
              <button onClick={onStop} className="control-btn stop">
                ⏹️ Stop
              </button>
            </>
          )}

          {!isProcessing && (
            <button onClick={onResume} className="control-btn resume">
              ⏯️ Resume
            </button>
          )}

          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`control-btn config ${showConfig ? 'active' : ''}`}
          >
            ⚙️ Config
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-btn"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {error && (
        <div className="frame-processor-error">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {showConfig && config && (
        <div className="frame-processor-config">
          <h4>Frame Processing Configuration</h4>
          
          <div className="config-grid">
            <div className="config-item">
              <label>Interval (ms):</label>
              <input
                type="number"
                min="100"
                max="5000"
                value={tempConfig.interval ?? config.interval}
                onChange={(e) => handleConfigChange('interval', parseInt(e.target.value))}
              />
            </div>

            <div className="config-item">
              <label>Target Width:</label>
              <input
                type="number"
                min="320"
                max="1920"
                value={tempConfig.targetWidth ?? config.targetWidth}
                onChange={(e) => handleConfigChange('targetWidth', parseInt(e.target.value))}
              />
            </div>

            <div className="config-item">
              <label>Target Height:</label>
              <input
                type="number"
                min="240"
                max="1080"
                value={tempConfig.targetHeight ?? config.targetHeight}
                onChange={(e) => handleConfigChange('targetHeight', parseInt(e.target.value))}
              />
            </div>

            <div className="config-item">
              <label>Max Frame Rate:</label>
              <input
                type="number"
                min="1"
                max="30"
                value={tempConfig.maxFrameRate ?? config.maxFrameRate}
                onChange={(e) => handleConfigChange('maxFrameRate', parseInt(e.target.value))}
              />
            </div>

            <div className="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={tempConfig.maintainAspectRatio ?? config.maintainAspectRatio}
                  onChange={(e) => handleConfigChange('maintainAspectRatio', e.target.checked)}
                />
                Maintain Aspect Ratio
              </label>
            </div>

            <div className="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={tempConfig.enableDebugCanvas ?? config.enableDebugCanvas}
                  onChange={(e) => handleConfigChange('enableDebugCanvas', e.target.checked)}
                />
                Debug Canvas
              </label>
            </div>

            <div className="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={tempConfig.skipFramesWhenBusy ?? config.skipFramesWhenBusy}
                  onChange={(e) => handleConfigChange('skipFramesWhenBusy', e.target.checked)}
                />
                Skip When Busy
              </label>
            </div>

            <div className="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={tempConfig.enableFaceDetection ?? config.enableFaceDetection}
                  onChange={(e) => handleConfigChange('enableFaceDetection', e.target.checked)}
                />
                Face Detection
              </label>
            </div>
          </div>

          <div className="config-actions">
            <button onClick={applyConfig} className="apply-btn">
              Apply Changes
            </button>
            <button onClick={resetConfig} className="reset-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isExpanded && stats && (
        <div className="frame-processor-details">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Current FPS:</span>
              <span className="stat-value">{formatNumber(stats.currentFPS)}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Average FPS:</span>
              <span className="stat-value">{formatNumber(stats.averageFPS)}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Total Frames:</span>
              <span className="stat-value">{stats.totalFrames}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Processed:</span>
              <span className="stat-value">{stats.processedFrames}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Skipped:</span>
              <span className="stat-value">{stats.skippedFrames}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Processing:</span>
              <span className="stat-value">{stats.isProcessing ? 'Yes' : 'No'}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Avg Process Time:</span>
              <span className="stat-value">{formatNumber(stats.averageProcessingTime)}ms</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Success Rate:</span>
              <span className="stat-value">
                {stats.totalFrames > 0 
                  ? formatNumber((stats.processedFrames / stats.totalFrames) * 100)
                  : '0'
                }%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameProcessorStatus;