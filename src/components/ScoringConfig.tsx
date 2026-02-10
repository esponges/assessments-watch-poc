import React, { useState, useEffect } from 'react';
import type { ScoringConfig } from '../types/scoring';
import './ScoringConfig.css';

interface ScoringConfigProps {
  config: ScoringConfig;
  onConfigChange: (newConfig: ScoringConfig) => void;
  isVisible: boolean;
  compact?: boolean;
  showPresets?: boolean;
}

const ScoringConfigComponent: React.FC<ScoringConfigProps> = ({
  config,
  onConfigChange,
  isVisible,
  compact = false,
  showPresets = true
}) => {
  const [localConfig, setLocalConfig] = useState<ScoringConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local config when prop changes
  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  // Check for changes
  useEffect(() => {
    const configChanged = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(configChanged);
  }, [localConfig, config]);

  if (!isVisible) {
    return null;
  }

  const handleConfigChange = (key: keyof ScoringConfig, value: number | boolean) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const handleApplyChanges = () => {
    onConfigChange(localConfig);
    setHasChanges(false);
  };

  const handleResetChanges = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  const applyPreset = (presetName: string) => {
    let presetConfig: ScoringConfig;

    switch (presetName) {
      case 'strict':
        presetConfig = {
          ...localConfig,
          multipleFacePoints: 15,
          lookingAwayPoints: 5,
          lookingAwayThreshold: 3000, // 3 seconds
          flagThreshold: 5,
          scoreDecayEnabled: false
        };
        break;
      case 'moderate':
        presetConfig = {
          ...localConfig,
          multipleFacePoints: 10,
          lookingAwayPoints: 3,
          lookingAwayThreshold: 5000, // 5 seconds (default)
          flagThreshold: 8,
          scoreDecayEnabled: false
        };
        break;
      case 'lenient':
        presetConfig = {
          ...localConfig,
          multipleFacePoints: 8,
          lookingAwayPoints: 2,
          lookingAwayThreshold: 8000, // 8 seconds
          flagThreshold: 12,
          scoreDecayEnabled: true,
          scoreDecayRate: 1.0
        };
        break;
      default:
        return;
    }

    setLocalConfig(presetConfig);
  };

  const formatDuration = (milliseconds: number): string => {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  const formatDecayRate = (rate: number): string => {
    return `${rate} pts/min`;
  };

  return (
    <div className={`scoring-config ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="config-header">
        <div className="config-title">
          <span className="config-icon">⚙️</span>
          <span className="config-text">Scoring Configuration</span>
        </div>
        
        {hasChanges && (
          <div className="changes-indicator">
            <span className="changes-badge">Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* Preset Selection */}
      {!compact && showPresets && (
        <div className="preset-section">
          <div className="preset-header">Quick Presets</div>
          <div className="preset-buttons">
            <button 
              className="preset-button strict" 
              onClick={() => applyPreset('strict')}
              title="Strict monitoring for high-stakes assessments"
            >
              Strict
            </button>
            <button 
              className="preset-button moderate" 
              onClick={() => applyPreset('moderate')}
              title="Balanced monitoring for standard assessments"
            >
              Moderate
            </button>
            <button 
              className="preset-button lenient" 
              onClick={() => applyPreset('lenient')}
              title="Lenient monitoring for low-stakes assessments"
            >
              Lenient
            </button>
          </div>
          <div className="preset-description">
            <strong>Strict:</strong> 15pts multiple faces, 5pts looking away (3s), flags at 5pts<br/>
            <strong>Moderate:</strong> 10pts multiple faces, 3pts looking away (5s), flags at 8pts<br/>
            <strong>Lenient:</strong> 8pts multiple faces, 2pts looking away (8s), flags at 12pts
          </div>
        </div>
      )}

      {/* Point Values */}
      <div className="config-section">
        <div className="section-header">Point Values</div>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="multipleFacePoints" className="config-label">
              Multiple Faces Detected
            </label>
            <div className="config-input-group">
              <input
                id="multipleFacePoints"
                type="number"
                min="1"
                max="50"
                value={localConfig.multipleFacePoints}
                onChange={(e) => handleConfigChange('multipleFacePoints', parseInt(e.target.value) || 1)}
                className="config-input"
              />
              <span className="config-unit">points</span>
            </div>
            <div className="config-help">
              Points awarded when multiple people are detected
            </div>
          </div>

          <div className="config-item">
            <label htmlFor="lookingAwayPoints" className="config-label">
              Extended Looking Away
            </label>
            <div className="config-input-group">
              <input
                id="lookingAwayPoints"
                type="number"
                min="1"
                max="20"
                value={localConfig.lookingAwayPoints}
                onChange={(e) => handleConfigChange('lookingAwayPoints', parseInt(e.target.value) || 1)}
                className="config-input"
              />
              <span className="config-unit">points</span>
            </div>
            <div className="config-help">
              Points awarded for looking away beyond threshold
            </div>
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="config-section">
        <div className="section-header">Detection Thresholds</div>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="lookingAwayThreshold" className="config-label">
              Looking Away Threshold
            </label>
            <div className="config-input-group">
              <input
                id="lookingAwayThreshold"
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={localConfig.lookingAwayThreshold}
                onChange={(e) => handleConfigChange('lookingAwayThreshold', parseInt(e.target.value) || 1000)}
                className="config-input"
              />
              <span className="config-unit">{formatDuration(localConfig.lookingAwayThreshold)}</span>
            </div>
            <div className="config-help">
              Minimum duration before looking away scores points
            </div>
          </div>

          <div className="config-item">
            <label htmlFor="flagThreshold" className="config-label">
              Flagging Threshold
            </label>
            <div className="config-input-group">
              <input
                id="flagThreshold"
                type="number"
                min="1"
                max="50"
                value={localConfig.flagThreshold}
                onChange={(e) => handleConfigChange('flagThreshold', parseInt(e.target.value) || 1)}
                className="config-input"
              />
              <span className="config-unit">points</span>
            </div>
            <div className="config-help">
              Score level that triggers assessment flagging
            </div>
          </div>

          <div className="config-item">
            <label htmlFor="maxScore" className="config-label">
              Maximum Score Cap
            </label>
            <div className="config-input-group">
              <input
                id="maxScore"
                type="number"
                min="10"
                max="500"
                value={localConfig.maxScore}
                onChange={(e) => handleConfigChange('maxScore', parseInt(e.target.value) || 10)}
                className="config-input"
              />
              <span className="config-unit">points</span>
            </div>
            <div className="config-help">
              Maximum score limit to prevent runaway scoring
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      {!compact && (
        <div className="config-section">
          <div className="section-header">Advanced Options</div>
          <div className="config-grid">
            <div className="config-item">
              <div className="config-checkbox-group">
                <input
                  id="scoreDecayEnabled"
                  type="checkbox"
                  checked={localConfig.scoreDecayEnabled}
                  onChange={(e) => handleConfigChange('scoreDecayEnabled', e.target.checked)}
                  className="config-checkbox"
                />
                <label htmlFor="scoreDecayEnabled" className="config-checkbox-label">
                  Enable Score Decay
                </label>
              </div>
              <div className="config-help">
                Gradually reduce score over time for good behavior
              </div>
            </div>

            {localConfig.scoreDecayEnabled && (
              <div className="config-item">
                <label htmlFor="scoreDecayRate" className="config-label">
                  Score Decay Rate
                </label>
                <div className="config-input-group">
                  <input
                    id="scoreDecayRate"
                    type="number"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={localConfig.scoreDecayRate}
                    onChange={(e) => handleConfigChange('scoreDecayRate', parseFloat(e.target.value) || 0.1)}
                    className="config-input"
                  />
                  <span className="config-unit">{formatDecayRate(localConfig.scoreDecayRate)}</span>
                </div>
                <div className="config-help">
                  Points lost per minute of good behavior
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div className="config-actions">
          <button 
            className="config-button apply" 
            onClick={handleApplyChanges}
          >
            Apply Changes
          </button>
          <button 
            className="config-button reset" 
            onClick={handleResetChanges}
          >
            Reset
          </button>
        </div>
      )}

      {/* Current Settings Summary */}
      <div className="config-summary">
        <div className="summary-header">Current Settings</div>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Multiple Faces:</span>
            <span className="summary-value">+{localConfig.multipleFacePoints} pts</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Looking Away:</span>
            <span className="summary-value">+{localConfig.lookingAwayPoints} pts after {formatDuration(localConfig.lookingAwayThreshold)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Flag Threshold:</span>
            <span className="summary-value">{localConfig.flagThreshold} pts</span>
          </div>
          {localConfig.scoreDecayEnabled && (
            <div className="summary-item">
              <span className="summary-label">Score Decay:</span>
              <span className="summary-value">{formatDecayRate(localConfig.scoreDecayRate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoringConfigComponent;