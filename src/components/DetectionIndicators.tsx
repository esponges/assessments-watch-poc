import React from 'react';
import type { DetectionIndicatorProps } from '../types/dashboard';
import './DetectionIndicators.css';

interface DetectionIndicatorsProps {
  sessionId: string;
}

const DetectionIndicators: React.FC<DetectionIndicatorsProps> = ({ sessionId }) => {
  // Mock data for demonstration
  const indicators: DetectionIndicatorProps[] = [
    {
      type: 'face_detection',
      status: 'active',
      confidence: 0.95,
      lastDetection: Date.now() - 30000,
      events: 45,
      compact: true
    },
    {
      type: 'gaze_tracking',
      status: 'active',
      confidence: 0.82,
      lastDetection: Date.now() - 15000,
      events: 23,
      compact: true
    },
    {
      type: 'multiple_person',
      status: 'warning',
      confidence: 0.67,
      lastDetection: Date.now() - 120000,
      events: 3,
      compact: true
    },
    {
      type: 'looking_away',
      status: 'inactive',
      confidence: 0.0,
      lastDetection: Date.now() - 300000,
      events: 8,
      compact: true
    }
  ];

  const getIndicatorIcon = (type: DetectionIndicatorProps['type']) => {
    switch (type) {
      case 'face_detection': return '👤';
      case 'gaze_tracking': return '👁️';
      case 'multiple_person': return '👥';
      case 'looking_away': return '👀';
      default: return '🔍';
    }
  };

  const getIndicatorLabel = (type: DetectionIndicatorProps['type']) => {
    switch (type) {
      case 'face_detection': return 'Face Detection';
      case 'gaze_tracking': return 'Gaze Tracking';
      case 'multiple_person': return 'Multiple People';
      case 'looking_away': return 'Looking Away';
      default: return 'Detection';
    }
  };

  const getStatusColor = (status: DetectionIndicatorProps['status']) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'warning': return '#ffc107';
      case 'error': return '#dc3545';
      case 'inactive': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatLastDetection = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="detection-indicators">
      <h4>🔍 Detection Status</h4>
      <div className="indicators-grid">
        {indicators.map((indicator) => (
          <div 
            key={indicator.type} 
            className={`indicator-card ${indicator.status}`}
          >
            <div className="indicator-header">
              <span className="indicator-icon">
                {getIndicatorIcon(indicator.type)}
              </span>
              <div className="indicator-info">
                <div className="indicator-name">
                  {getIndicatorLabel(indicator.type)}
                </div>
                <div className="indicator-status">
                  <span 
                    className="status-dot" 
                    style={{ backgroundColor: getStatusColor(indicator.status) }}
                  ></span>
                  {indicator.status.charAt(0).toUpperCase() + indicator.status.slice(1)}
                </div>
              </div>
            </div>
            
            <div className="indicator-metrics">
              <div className="metric">
                <span className="metric-label">Confidence:</span>
                <span className="metric-value">
                  {Math.round(indicator.confidence * 100)}%
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Events:</span>
                <span className="metric-value">{indicator.events}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Last:</span>
                <span className="metric-value">
                  {formatLastDetection(indicator.lastDetection)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionIndicators;