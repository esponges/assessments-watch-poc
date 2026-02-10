import { useState, useEffect } from 'react';
import type { 
  EnhancedGazeEstimation, 
  GazeZone, 
  GazeStats 
} from '../types/gazeDetection';
import './GazeIndicator.css';

interface GazeIndicatorProps {
  gazeEstimation: EnhancedGazeEstimation | null;
  stats: GazeStats | null;
  isVisible: boolean;
  compact?: boolean;
  showZone?: boolean;
  showDeviation?: boolean;
  showConfidence?: boolean;
}

const GazeIndicator: React.FC<GazeIndicatorProps> = ({
  gazeEstimation,
  stats,
  isVisible,
  compact = false,
  showZone = true,
  showDeviation = true,
  showConfidence = true
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Trigger blink animation when gaze changes significantly
  useEffect(() => {
    if (gazeEstimation && gazeEstimation.previousZone !== gazeEstimation.zone) {
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [gazeEstimation?.zone, gazeEstimation?.previousZone]);

  if (!isVisible || !gazeEstimation) {
    return null;
  }

  const getZoneColor = (zone: GazeZone): string => {
    switch (zone) {
      case 'center': return '#28a745';
      case 'left':
      case 'right': return '#ffc107';
      case 'up':
      case 'down': return '#fd7e14';
      case 'up-left':
      case 'up-right':
      case 'down-left':
      case 'down-right': return '#dc3545';
      case 'away': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getZoneIcon = (zone: GazeZone): string => {
    switch (zone) {
      case 'center': return '🎯';
      case 'left': return '⬅️';
      case 'right': return '➡️';
      case 'up': return '⬆️';
      case 'down': return '⬇️';
      case 'up-left': return '↖️';
      case 'up-right': return '↗️';
      case 'down-left': return '↙️';
      case 'down-right': return '↘️';
      case 'away': return '👁️‍🗨️';
      default: return '👁️';
    }
  };

  const getZoneLabel = (zone: GazeZone): string => {
    return zone.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    if (confidence >= 0.4) return '#fd7e14';
    return '#dc3545';
  };

  const getDeviationSeverity = (deviation: number): 'low' | 'medium' | 'high' => {
    if (deviation <= 10) return 'low';
    if (deviation <= 25) return 'medium';
    return 'high';
  };

  const renderGazeVisualization = () => {
    const gazeX = gazeEstimation.gazePoint.x * 50; // Scale for visualization
    const gazeY = gazeEstimation.gazePoint.y * 50;
    
    return (
      <div className="gaze-visualization">
        <div className="gaze-screen">
          <div className="screen-grid">
            {/* Grid lines */}
            <div className="grid-line horizontal" style={{ top: '33.33%' }} />
            <div className="grid-line horizontal" style={{ top: '66.66%' }} />
            <div className="grid-line vertical" style={{ left: '33.33%' }} />
            <div className="grid-line vertical" style={{ left: '66.66%' }} />
            
            {/* Center point */}
            <div className="center-point" />
            
            {/* Gaze point */}
            <div 
              className="gaze-point"
              style={{
                left: `calc(50% + ${gazeX}px)`,
                top: `calc(50% + ${gazeY}px)`,
                backgroundColor: getZoneColor(gazeEstimation.zone)
              }}
            />
            
            {/* Gaze trail */}
            {gazeEstimation.history.slice(-3).map((point, index) => (
              <div
                key={index}
                className="gaze-trail"
                style={{
                  left: `calc(50% + ${point.x * 50}px)`,
                  top: `calc(50% + ${point.y * 50}px)`,
                  opacity: 0.3 + (index * 0.2)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`gaze-indicator ${compact ? 'compact' : ''} ${isBlinking ? 'blinking' : ''}`}>
      <div className="gaze-header">
        <div className="gaze-status">
          <span className="gaze-icon">{getZoneIcon(gazeEstimation.zone)}</span>
          <div className="gaze-info">
            <div className="gaze-title">Gaze Tracking</div>
            {showZone && (
              <div 
                className="gaze-zone"
                style={{ color: getZoneColor(gazeEstimation.zone) }}
              >
                {getZoneLabel(gazeEstimation.zone)}
              </div>
            )}
          </div>
        </div>

        {!compact && (
          <div className="gaze-metrics">
            {showConfidence && (
              <div className="metric">
                <span className="metric-label">Confidence</span>
                <span 
                  className="metric-value"
                  style={{ color: getConfidenceColor(gazeEstimation.confidence) }}
                >
                  {(gazeEstimation.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
            
            {showDeviation && (
              <div className="metric">
                <span className="metric-label">Deviation</span>
                <span 
                  className={`metric-value deviation-${getDeviationSeverity(gazeEstimation.deviation)}`}
                >
                  {gazeEstimation.deviation.toFixed(1)}°
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {!compact && renderGazeVisualization()}

      {!compact && stats && (
        <div className="gaze-stats">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-label">Stability</span>
              <span className="stat-value">
                {(stats.gazeStability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Look Away Events</span>
              <span className="stat-value">{stats.lookAwayEvents}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Deviation</span>
              <span className="stat-value">
                {stats.averageDeviation.toFixed(1)}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Eye state indicators */}
      <div className="eye-state">
        <div className={`eye-indicator left ${gazeEstimation.leftEyeOpen ? 'open' : 'closed'}`}>
          👁️
        </div>
        <div className={`eye-indicator right ${gazeEstimation.rightEyeOpen ? 'open' : 'closed'}`}>
          👁️
        </div>
      </div>

      {/* Looking away alert */}
      {gazeEstimation.isLookingAway && (
        <div className="looking-away-alert">
          ⚠️ Looking Away
        </div>
      )}
    </div>
  );
};

export default GazeIndicator;