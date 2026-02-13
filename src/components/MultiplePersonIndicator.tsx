import { useState, useEffect } from 'react';
import type { 
  MultiplePersonDetectionStatus
} from '../types/multiplePersonDetector';
import './MultiplePersonIndicator.css';

interface MultiplePersonIndicatorProps {
  detectionStatus: MultiplePersonDetectionStatus | null;
  isVisible: boolean;
  compact?: boolean;
  showConfidence?: boolean;
}

const MultiplePersonIndicator: React.FC<MultiplePersonIndicatorProps> = ({
  detectionStatus,
  isVisible,
  compact = false,
  showConfidence = true
}) => {
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  // Get current event ID directly from props
  const currentEventId = detectionStatus?.lastEvent?.id || null;

  // Update lastEventId during render if it changed (this is allowed)
  if (currentEventId && currentEventId !== lastEventId) {
    setLastEventId(currentEventId);
  }

  // Effect to manage blinking timer - subscribes to external timer system
  useEffect(() => {
    if (isBlinking) {
      const timer = setTimeout(() => {
        setIsBlinking(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isBlinking]);

  // Trigger blink when new event is detected - during render phase
  if (currentEventId && currentEventId !== lastEventId && !isBlinking) {
    setIsBlinking(true);
  }

  if (!isVisible || !detectionStatus) {
    return null;
  }

  const formatDuration = (duration: number): string => {
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const getIndicatorClass = (): string => {
    let className = 'multiple-person-indicator';
    
    if (compact) className += ' compact';
    if (detectionStatus.isMultiplePersonsDetected) className += ' active';
    if (detectionStatus.isSustained) className += ' sustained';
    if (isBlinking) className += ' blinking';
    
    return className;
  };

  const getStatusText = (): string => {
    if (!detectionStatus.isMultiplePersonsDetected) {
      return detectionStatus.faceCount === 1 ? 'Single person detected' : 'No faces detected';
    }
    
    if (detectionStatus.isSustained) {
      return `Multiple persons (${detectionStatus.faceCount}) - SUSTAINED`;
    }
    
    return `Multiple persons detected (${detectionStatus.faceCount})`;
  };

  const getStatusIcon = (): string => {
    if (!detectionStatus.isMultiplePersonsDetected) {
      return detectionStatus.faceCount === 1 ? '👤' : '❌';
    }
    
    return detectionStatus.isSustained ? '🚨' : '👥';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className={getIndicatorClass()}>
      <div className="indicator-main">
        <div className="indicator-icon">
          {getStatusIcon()}
        </div>
        
        <div className="indicator-content">
          <div className="indicator-status">
            {getStatusText()}
          </div>
          
          <div className="indicator-details">
            {detectionStatus.isMultiplePersonsDetected && (
              <span className="duration">
                {formatDuration(detectionStatus.currentDuration)}
              </span>
            )}
            
            {showConfidence && (
              <span 
                className="confidence"
                style={{ color: getConfidenceColor(detectionStatus.confidence) }}
              >
                {(detectionStatus.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        
        {detectionStatus.isMultiplePersonsDetected && (
          <div className="alert-badge">
            ALERT
          </div>
        )}
      </div>
      
      {/* Progress bar for sustained detection */}
      {detectionStatus.isMultiplePersonsDetected && !compact && (
        <div className="sustain-progress">
          <div className="progress-label">
            Sustained Detection Progress
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${Math.min((detectionStatus.currentDuration / 3000) * 100, 100)}%`,
                backgroundColor: detectionStatus.isSustained ? '#28a745' : '#ffc107'
              }}
            />
          </div>
          <div className="progress-text">
            {detectionStatus.isSustained ? 'SUSTAINED' : `${(3 - detectionStatus.currentDuration / 1000).toFixed(1)}s to sustained`}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplePersonIndicator;
