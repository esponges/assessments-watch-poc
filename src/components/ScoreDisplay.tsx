import { useState, useEffect } from 'react';
import type { ScoreStatus } from '../types/multiplePersonDetector';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  scoreStatus: ScoreStatus | null;
  isVisible: boolean;
  compact?: boolean;
  showHistory?: boolean;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  scoreStatus,
  isVisible,
  compact = false,
  showHistory = true
}) => {
  const [animatingScore, setAnimatingScore] = useState<number | null>(null);

  // Animate score changes
  useEffect(() => {
    const lastEvent = scoreStatus?.lastScoreEvent;
    if (lastEvent && lastEvent.points > 0) {
      setAnimatingScore(lastEvent.points);
      
      const timer = setTimeout(() => {
        setAnimatingScore(null);
      }, 2000); // Animation duration

      return () => clearTimeout(timer);
    }
  }, [scoreStatus?.lastScoreEvent?.id]);

  if (!isVisible || !scoreStatus) {
    return null;
  }

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getFlagLevelColor = (flagLevel: ScoreStatus['flagLevel']): string => {
    switch (flagLevel) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#ffc107';
      default: return '#28a745';
    }
  };

  const getFlagLevelText = (flagLevel: ScoreStatus['flagLevel']): string => {
    switch (flagLevel) {
      case 'high': return 'HIGH RISK';
      case 'medium': return 'MEDIUM RISK';
      case 'low': return 'LOW RISK';
      default: return 'NORMAL';
    }
  };

  const recentEvents = scoreStatus.scoreHistory.slice(-5); // Show last 5 events

  return (
    <div className={`score-display ${compact ? 'compact' : ''}`}>
      {/* Main Score Display */}
      <div className="score-main">
        <div className="score-header">
          <h4>Assessment Score</h4>
          {scoreStatus.isFlagged && (
            <div 
              className="flag-indicator"
              style={{ backgroundColor: getFlagLevelColor(scoreStatus.flagLevel) }}
            >
              ⚠️ {getFlagLevelText(scoreStatus.flagLevel)}
            </div>
          )}
        </div>

        <div className="score-value-container">
          <div className={`score-value ${scoreStatus.isFlagged ? 'flagged' : ''}`}>
            {scoreStatus.totalScore}
          </div>
          
          {animatingScore && (
            <div className="score-animation">
              +{animatingScore}
            </div>
          )}
        </div>

        <div className="score-status">
          <span className="score-label">
            Status: 
          </span>
          <span 
            className="score-status-text"
            style={{ color: getFlagLevelColor(scoreStatus.flagLevel) }}
          >
            {getFlagLevelText(scoreStatus.flagLevel)}
          </span>
        </div>
      </div>

      {/* Recent Score Events */}
      {!compact && showHistory && recentEvents.length > 0 && (
        <div className="score-events">
          <div className="events-header">
            <h5>Recent Score Events</h5>
          </div>
          <div className="events-list">
            {recentEvents.map((event) => (
              <div key={event.id} className="score-event">
                <div className="event-main">
                  <div className="event-points">
                    +{event.points}
                  </div>
                  <div className="event-details">
                    <div className="event-reason">{event.reason}</div>
                    <div className="event-meta">
                      <span className="event-time">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      <span className="event-confidence">
                        {(event.confidence * 100).toFixed(0)}% confidence
                      </span>
                      {event.metadata?.faceCount && (
                        <span className="event-faces">
                          {event.metadata.faceCount} faces
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Legend (compact view) */}
      {compact && (
        <div className="score-legend">
          <div className="legend-item">
            <span className="legend-label">Multiple faces:</span>
            <span className="legend-value">+10 pts</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;