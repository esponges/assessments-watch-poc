import React, { useEffect, useRef } from 'react';
import type { AssessmentTimerProps } from '../types/assessment';
import './AssessmentTimer.css';

const AssessmentTimer: React.FC<AssessmentTimerProps> = ({
  timeRemaining,
  totalTime,
  isWarning,
  isPaused,
  onTimeUp
}) => {
  const prevTimeRef = useRef(timeRemaining);
  
  useEffect(() => {
    // Check if time has run out
    if (timeRemaining <= 0 && prevTimeRef.current > 0) {
      onTimeUp();
    }
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.max(0, Math.min(100, ((totalTime - timeRemaining) / totalTime) * 100));
  const isTimeUp = timeRemaining <= 0;
  const isCritical = timeRemaining <= 60 && timeRemaining > 0; // Last minute
  
  return (
    <div className={`assessment-timer ${isPaused ? 'paused' : ''} ${isWarning ? 'warning' : ''} ${isCritical ? 'critical' : ''} ${isTimeUp ? 'time-up' : ''}`}>
      <div className="timer-display">
        <div className="timer-icon">
          {isPaused ? '⏸️' : isTimeUp ? '⏰' : '⏱️'}
        </div>
        
        <div className="timer-content">
          <div className="time-text">
            {formatTime(Math.max(0, timeRemaining))}
          </div>
          
          <div className="timer-status">
            {isPaused && <span className="status-label">Paused</span>}
            {isTimeUp && <span className="status-label time-up-label">Time's Up!</span>}
            {!isPaused && !isTimeUp && isWarning && (
              <span className="status-label warning-label">
                {isCritical ? 'Final minute!' : 'Time running low'}
              </span>
            )}
            {!isPaused && !isTimeUp && !isWarning && (
              <span className="status-label normal-label">Assessment in progress</span>
            )}
          </div>
        </div>
        
        <div className="timer-progress">
          <div className="progress-ring">
            <svg className="progress-ring-svg" width="60" height="60">
              <circle
                className="progress-ring-circle-bg"
                stroke="#e9ecef"
                strokeWidth="4"
                fill="transparent"
                r="26"
                cx="30"
                cy="30"
              />
              <circle
                className={`progress-ring-circle ${isWarning ? 'warning' : ''} ${isCritical ? 'critical' : ''}`}
                stroke={isCritical ? '#dc3545' : isWarning ? '#ffc107' : '#007bff'}
                strokeWidth="4"
                fill="transparent"
                r="26"
                cx="30"
                cy="30"
                style={{
                  strokeDasharray: `${2 * Math.PI * 26}`,
                  strokeDashoffset: `${2 * Math.PI * 26 * (1 - progressPercentage / 100)}`,
                  transform: 'rotate(-90deg)',
                  transformOrigin: '30px 30px'
                }}
              />
            </svg>
            <div className="progress-percentage">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>
      </div>

      {isCritical && !isPaused && !isTimeUp && (
        <div className="critical-warning">
          ⚠️ Less than one minute remaining!
        </div>
      )}

      {isTimeUp && (
        <div className="time-up-message">
          🕐 Time has expired. Your assessment will be automatically submitted.
        </div>
      )}
    </div>
  );
};

export default AssessmentTimer;