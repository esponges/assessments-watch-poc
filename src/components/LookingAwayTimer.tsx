import { useState, useEffect } from 'react';
import type {
  LookingAwayTimerState,
  LookingAwayWarning,
  LookingAwayStats,
  LookingAwaySeverity
} from '../types/lookingAwayDetection';
import './LookingAwayTimer.css';

interface LookingAwayTimerProps {
  timerState: LookingAwayTimerState | null;
  warning: LookingAwayWarning | null;
  stats: LookingAwayStats | null;
  isVisible: boolean;
  compact?: boolean;
  showProgress?: boolean;
  showStats?: boolean;
}

const LookingAwayTimer: React.FC<LookingAwayTimerProps> = ({
  timerState,
  warning,
  stats,
  isVisible,
  compact = false,
  showProgress = true,
  showStats = true
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger animations on timer state changes
  useEffect(() => {
    if (timerState?.isActive && timerState.shouldShowWarning) {
      setIsBlinking(true);
      setAnimationKey(prev => prev + 1);
      
      const timer = setTimeout(() => setIsBlinking(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [timerState?.isActive, timerState?.shouldShowWarning]);

  if (!isVisible) {
    return null;
  }

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor((milliseconds % 1000) / 100);
    return `${seconds}.${ms}s`;
  };

  const getSeverityColor = (severity: LookingAwaySeverity): string => {
    switch (severity) {
      case 'minor': return '#ffc107';
      case 'moderate': return '#fd7e14'; 
      case 'severe': return '#dc3545';
      case 'critical': return '#721c24';
      default: return '#6c757d';
    }
  };

  const getSeverityLabel = (severity: LookingAwaySeverity): string => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  const getProgressColor = (progress: number, severity: LookingAwaySeverity): string => {
    if (progress < 0.5) return '#28a745';
    if (progress < 0.8) return '#ffc107';
    return getSeverityColor(severity);
  };

  return (
    <div className={`looking-away-timer ${compact ? 'compact' : ''} ${isBlinking ? 'blinking' : ''}`}>
      <div className="timer-header">
        <div className="timer-title">
          <span className="timer-icon">
            {timerState?.isActive ? '⏱️' : '👁️'}
          </span>
          <span className="timer-text">Looking Away Detection</span>
        </div>

        {timerState?.isActive && (
          <div className="timer-status">
            <div 
              className="severity-badge"
              style={{ backgroundColor: getSeverityColor(timerState.severity) }}
            >
              {getSeverityLabel(timerState.severity)}
            </div>
          </div>
        )}
      </div>

      {/* Active Timer Display */}
      {timerState?.isActive && (
        <div className="active-timer">
          <div className="timer-main">
            <div className="current-time">
              {formatTime(timerState.currentTime)}
            </div>
            <div className="time-label">Looking Away</div>
          </div>

          {showProgress && (
            <div className="progress-section">
              <div className="progress-label">
                Time to Scoring: {formatTime(timerState.timeToScoring)}
              </div>
              <div className="progress-container">
                <div 
                  className="progress-bar"
                  style={{ backgroundColor: '#e9ecef' }}
                >
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${timerState.progressToScoring * 100}%`,
                      backgroundColor: getProgressColor(timerState.progressToScoring, timerState.severity)
                    }}
                    key={animationKey}
                  />
                </div>
                <div className="progress-percentage">
                  {(timerState.progressToScoring * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning Display */}
      {warning && (
        <div 
          className={`warning-section warning-${warning.level}`}
          style={{ borderLeftColor: warning.color }}
        >
          <div className="warning-content">
            <span className="warning-icon">{warning.icon}</span>
            <span className="warning-message">{warning.message}</span>
          </div>
          
          {warning.showCountdown && warning.timeRemaining > 0 && (
            <div className="warning-countdown">
              {formatTime(warning.timeRemaining)}
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      {!compact && showStats && stats && (
        <div className="timer-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.scoringEvents}</div>
              <div className="stat-label">Scoring Events</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">
                {formatTime(stats.totalLookingAwayTime)}
              </div>
              <div className="stat-label">Total Time</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">
                {formatTime(stats.maxContinuousDuration)}
              </div>
              <div className="stat-label">Max Duration</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.totalPointsAwarded}</div>
              <div className="stat-label">Points Awarded</div>
            </div>
          </div>

          {stats.commonDirection && (
            <div className="common-direction">
              <span className="direction-label">Most Common:</span>
              <span className="direction-value">
                {stats.commonDirection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inactive State */}
      {!timerState?.isActive && !warning && (
        <div className="inactive-state">
          <div className="inactive-message">
            <span className="inactive-icon">✅</span>
            <span className="inactive-text">Attention on Screen</span>
          </div>
          
          {stats && stats.scoringEvents > 0 && (
            <div className="session-summary">
              <span>{stats.scoringEvents} events, {stats.totalPointsAwarded} points</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LookingAwayTimer;